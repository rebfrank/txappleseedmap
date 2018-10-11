// Copyright (c) 2013 Ryan Clark
// https://gist.github.com/rclark/5779673
L.TopoJSON = L.GeoJSON.extend({
    addData: function(jsonData) {
        if (jsonData.type === "Topology") {
            for (key in jsonData.objects) {
                geojson = topojson.feature(jsonData, jsonData.objects[key]);
                L.GeoJSON.prototype.addData.call(this, geojson);
            }
        }
        else {
            L.GeoJSON.prototype.addData.call(this, jsonData);
        }
    }
});

const groupToProcessedDataKey = {
    "Black/African American Students": "BLA",
    "Asian Students": "ASI",
    "Latino/Hispanic Students": "HIS",
    "Indigenous American Students": "IND",
    "Special Education Students": "SPE",
    "Students of Two or More Races": "TWO",
    "White Students": "WHI",
    "Hawaiian/Pacific Students": "PCI",
};

const punishmentToProcessedDataKey = {
    "Expulsions" : "EXP",
    "Alternative Placements"    : "DAE",
    "Out of School Suspensions"       : "OSS",
    "In School Suspensions"       : "ISS"
};

var PageControl = (function(){
    "use strict";

    function Map( selector ) {

        // Rename 'this' for use in callbacks
        var thisMap = this;
        this.dataSet = "OSS"; // delete this when possible
        this.punishment = "Out of School Suspensions";
        this.population = "Black/African American Students";
        this.punishmentKey = punishmentToProcessedDataKey[this.punishment];
        this.groupkey = groupToProcessedDataKey[this.population];
        this.hilight_layer = null;
        this.districtLayer = null;
        this.schoolYear = "2015-2016"

        this.$el = $( selector );

        this.mapObject = new L.Map('map', {
            center: [31.50, -98.41], // Johnson City
            zoom: 7
        });

        /*  this.tileLayer = L.tileLayer('https://tile.stamen.com/toner/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">Stamen</a> contributors'
        }); */

        this.tileLayer = L.tileLayer("https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://cartodb.com/attributions">CartoDB</a>'
        });


        this.displaypunishment = {
            "Expulsion" : "expulsion actions",
            "AltEdu"    : "alternative placements",
            "OSS"       : "out-of-school suspensions",
            "ISS"       : "in-school suspensions"
        };

        this.punishments = {
            "Expulsion" : "Expulsion",
            "AltEdu"    : "AltEdu",
            "OSS"       : "OSS",
            "ISS"       : "ISS"
        };




        // Dictionary that maps option values to GeoJSON data file paths
        this.dataFiles = {
            "Expulsion" : "topojson/expulsion_topo.json",
            "AltEdu"    : "topojson/altedu_topo.json",
            "OSS"       : "topojson/oss_topo.json",
            //"OSS"       : "geojson/simple_oss.geojson",
            "ISS"       : "topojson/iss_topo.json"
        };


        // Default Stripes.
        this.stripes = new L.StripePattern({
            weight: 1,
            spaceWeight: .5,
            color: '#b3b3b3',
            angle: 45
        });


        this.$el.find(".selector__button").on("click", {context: this}, this.handleDataToggleClick);
        $(".student_characteristic_selector").on("change", {context: this}, this.handleDataToggleClick);
        $(".punishment_selector").on("change", {context: this}, this.handleDataToggleClick);

        // Attach event handler to drop-down menu to update data after
        // selection changed.
        $(".student_characteristic_selector").on(
            "change",
            {context: this},
            function(event) {

                // Get the selection from the drop-down menu
                this.dataSet = $(".student_characteristic_selector").find("option:selected").val();
                //console.log("In dropdown " + this.dataSet);
                // Load the data from the corresponding file
                thisMap.selectData(this.dataSet);
                $('.selector__title').html(event.data.context.displaypunishment[this.dataSet]);
            }
        );
        this.setUp();
    };

    Map.prototype.setUp = function () {
        this.loadData();
        var mapClass = this,
            mapObject = this.mapObject,
            tileLayer  = this.tileLayer,
            stripes = this.stripes,
            options = this.getOptions();
        // Adds tileLayer from the Map Class to the mapObject
        stripes.addTo(mapObject); //adding pattern definition to mapObject
        tileLayer.addTo(mapObject);
        //this.requestInitialData(options);
        this.loadGeojsonLayer(this.dataSet, options);
    };


    Map.prototype.getOptions = function () {
        return {

            style: function style(feature) {
                const punishmentKey = punishmentToProcessedDataKey[this.punishment];
                // temporarily hardcode the year until we have a year dropdown
                const year = '2015';
                const groupKey = groupToProcessedDataKey[this.population];
                const selectedData = this.processedData[year][groupKey][punishmentKey];
                const districtData = selectedData[String(feature.properties.district_number)];
                const value = districtData ? districtData['S'] : null;
                return {
                        fillColor: this.getFillColor(value),
                        weight: 1,
                        opacity: 1,
                        color: '#b3b3b3',
                        fillOpacity: 0.6,
                        fillPattern: (value != null) ? null : this.stripes
                };
            }.bind(this),
            //popup information for each district
            onEachFeature: function onEachFeature(feature, layer) {
                const groupNameInPopup = this.population;
                const punishmentType = this.punishment;
                const schoolYear = this.schoolYear;
                const districtNumber = String(feature.properties.district_number);
                const punishmentKey = this.punishmentKey;
                // temporarily hardcode the year until we have a year dropdown
                const year = '2015';
                const groupKey = groupToProcessedDataKey[this.population];
                const populationOfThisGroup =   this.processedData[year][groupKey]['POP'][districtNumber];
                const populationTotal =         this.processedData[year]['ALL']['POP'][districtNumber];
                const punishmentOfThisGroup =   this.processedData[year][groupKey][punishmentKey][districtNumber];
                const punishmentTotal =         this.processedData[year]['ALL'][punishmentKey][districtNumber];
                const validData = (populationOfThisGroup && populationTotal && punishmentOfThisGroup && punishmentTotal);
                const districtName = feature.properties.district_name;

                var popupContent;

                if (populationOfThisGroup && populationOfThisGroup['C'] == '0') {
                    popupContent = "<span class='popup-text'>" + districtName + " reported that it had no " + groupNameInPopup + " for the <b>" + schoolYear + "</b> school year.</span>";
                }
                else if (punishmentTotal && punishmentTotal['C'] == '0') {
                    popupContent = "<span class='popup-text'>" + districtName + " reported that it had no " + punishmentType + " for the <b>" + schoolYear + "</b> school year.</span>";
                }
                else if (validData){
                    const percentStudentsByGroup = Number(populationOfThisGroup['C']) * 100.0 / Number(populationTotal['C']);
                    const punishmentPercent = Number(punishmentOfThisGroup['C']) * 100.0 / Number(punishmentTotal['C']);
                    popupContent = [
                        "<span class='popup-text'>",
                        "In <b>" + districtName + "</b>, ",
                        groupNameInPopup + " received " + Math.round(punishmentPercent*100)/100.0 + "% of " + punishmentType + " and represent ",
                         + Math.round(percentStudentsByGroup*100)/100.0 + "% of the student population ",
                        "</span>"
                    ].join('');
                }
                else {
                    popupContent = "<span class='popup-text'>Data not available in <b>" + districtName + "</b> for this student group.</span>";
                }
                if (feature.properties) layer.bindPopup(popupContent);
            }.bind(this)
        };

    };

    //sets population when user clicks choice
    Map.prototype.handleDataToggleClick = function (e) {
        //remove active button style
        $(".selector__button").removeClass("selector__button--active");
        console.log("Me me me");
        var thisMap = e.data.context;
        thisMap.population = $(".student_characteristic_selector").find("option:selected").text();
        thisMap.punishment = $(".punishment_selector").find("option:selected").text();
        var options = thisMap.getOptions();

        thisMap.districtLayer.setStyle(options.style);
        thisMap.districtLayer.eachLayer(function (layer) {
            options.onEachFeature(layer.feature, layer);
        });

    };

    Map.prototype.clearGeojsonLayer = function(){
        var map = this.mapObject;
        // Remove all layers which have 'feature' properties
        map.eachLayer(function (layer) {
            if (layer.feature) map.removeLayer(layer);
        });
    };

    // Loads data from GeoJSON file and adds layer to map
    Map.prototype.loadGeojsonLayer = function(dataKey, geoJsonOptions) {
        // Get path to data file
        var path = this.dataFiles[dataKey];
        //console.log(path + " is the path and " + dataKey + " is the key " + JSON.stringify(geoJsonOptions));
        // Load data from file
        $.ajax({
            dataType: "json",
            geoJsonOptions: geoJsonOptions,
            url: path,
            context: this,
            success: function(data) {
                // Add the data layer to the map
                this.addDistrictsToMap(data, this.mapObject, geoJsonOptions);
                window.GEODATA = data;
            },
        });

    };

    // Loads data from data JSON file
    Map.prototype.loadData = function() {
        const path = "data/processed/stpp2015.json";
        $.ajax({
            dataType: "json",
            url: path,
            context: this,
            success: function(data) {
                this.processedData = data;
            },
            error: function(e) {
                console.log('Failure to load json with status ' + e);
            }
        });

    };

    // Update data after selection is made
    Map.prototype.selectData = function(dataKey) {
        const options = this.getOptions();
        this.dataSet = dataKey;
        this.districtLayer.setStyle(options.style);
        this.districtLayer.eachLayer(function (layer) {
            options.onEachFeature(layer.feature, layer);
        });
    };

    Map.prototype.addDistrictsToMap = function (data, map, options) {
        var districtNames = [];
        var layers = new Object();
        this.districtLayer = new L.TopoJSON(null, options);
        this.districtLayer.addData(data);
        var thisMap = this;
        for (var key in this.districtLayer._layers) {
            var dName = this.districtLayer._layers[key].feature.properties.district_name;
            if (dName) {
                districtNames.push(dName);
                layers[dName] = this.districtLayer._layers[key];
            }
        }
        this.districtLayer.addTo(map);


        //console.log(data);  //.objects.simple_oss.geometries.properties.district_name);
        //for (var n = 0; n < data.objects.simple_oss.geometries.length; n++) {
            //var dName = data.objects.simple_oss.geometries[n].properties.district_name;
            //if (dName)
                //districtNames.push(dName);
                //districtBounds[dName] = L.polygon(data.objects.simple_oss.geometries[n].geometry.coordinates).getBounds();
        //}



        // autocomplete searchbox stuff
        $("#searchbox").autocomplete({
            source: districtNames,
            select: function(event, ui){
                if(ui.item){
                    $('#searchbox').val(ui.item.value);
                }
                var hiStyle = {
                    weight: 5,
                    color: '#ceda6a',
                    opacity: 1
                };
                var layer = layers[ui.item.value];
                thisMap.clearHighlight();
                thisMap.hilight_layer = layer;
                layer.setStyle(hiStyle);
                map.fitBounds(layer.getBounds());
            }
        });

    };

    Map.prototype.clearHighlight = function() {
        if (this.hilight_layer != null) {
            this.districtLayer.resetStyle(this.hilight_layer);
        }
    };

    Map.prototype.getFillColor =   function (value) {
        var red    = ['#fee5d9','#fcbba1','#fc9272','#fb6a4a','#de2d26','#a50f15'],
        purple = ['#f2f0f7','#dadaeb','#bcbddc','#9e9ac8','#756bb1','#54278f'],
        gray   = '#DEDCDC';

        return value == 0  ? purple[5] :
        value == 1   ? purple[4] :
        value == 2   ? purple[3] :
        value == 3   ? purple[2] :
        value == 4   ? purple[1] :
        value == 5   ? 'white' :
        value == 6   ? red[1] :
        value == 7   ? red[2] :
        value == 8   ? red[3]  :
        value == 9   ? red[4]  :
        value == 10  ? red[5]  :
        gray;
    };


    // Return a reference to the map
    return(new Map( "#leMap" ));

})();
