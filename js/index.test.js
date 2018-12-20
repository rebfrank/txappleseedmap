const mockData = {
    1902: {
        C: 7,
        P: 43,
        S: 5,
        aC: 46,
        aP: 622
    },
    1904: {
        C: 1,
        P: 100,
        S: 10,
        aC: 46,
        aP: 622
    },
    1905: {
        C: 7,
        P: 43,
        S: 0,
        aC: 46,
        aP: 622
    },
    1908: {
        C: 0,
        P: 3,
        S: 0,
        aC: 46,
        aP: 622
    },
    // district with missing data
    1906: {
        P: 923
    },
    // district with error in reporting
    1907: {
        C: 1,
        S: -1,
        P: 0,
        aC: 2,
        aP: 193
    },
};

const mockFeature = (district_number) => {
    return {
        properties: {
            district_number: district_number,
            district_name: "Test District Name",
        }
    };
};

beforeEach(() => {
    L = require('leaflet-headless');
    Pattern = require('./leaflet.pattern.js');
    $ = require('jquery');
    document.body.innerHTML = '<div class="viewport" id="leMap"><div id="map" class="map">' +
        '</div>' +
        '<select class="year_selector" id="searchbox"><option value="2016">2015-2016</option></select>';
    var Map = require('./index.js');
    M = new Map("leMap");
});

test('style of value 5 returns white style', () => {
    M.processedData = mockData;
    style = M.getOptions().style(mockFeature(1902));
    expect(style.fillColor).toEqual('white');
    expect(style.weight).toBe(1);
    expect(style.opacity).toBe(1);
    expect(style.color).toBe('#b3b3b3');
    expect(style.fillOpacity).toBe(0.6);
    expect(style.fillPattern).toBeFalsy();
});

test('style of value 0 returns dark purple style', () => {
    M.processedData = mockData;
    style = M.getOptions().style(mockFeature(1905));
    expect(style.fillColor).toEqual('#2d004b');
    expect(style.weight).toBe(1);
    expect(style.opacity).toBe(1);
    expect(style.color).toBe('#b3b3b3');
    expect(style.fillOpacity).toBe(0.6);
    expect(style.fillPattern).toBeFalsy();
});

test('style of value 10 returns dark red style', () => {
    M.processedData = mockData;
    style = M.getOptions().style(mockFeature(1904));
    expect(style.fillColor).toEqual('#aa0208');
    expect(style.weight).toBe(1);
    expect(style.opacity).toBe(1);
    expect(style.color).toBe('#b3b3b3');
    expect(style.fillOpacity).toBe(0.6);
    expect(style.fillPattern).toBeFalsy();
});

test('style of district that does not exist returns stripes', () => {
    M.processedData = mockData;
    style = M.getOptions().style(mockFeature(101));
    expect(style.fillColor).toEqual('#707070');
    expect(style.weight).toBe(1);
    expect(style.opacity).toBe(1);
    expect(style.color).toBe('#b3b3b3');
    expect(style.fillOpacity).toBe(0.6);
    expect(style.fillPattern).toBe(M.stripes);
});

test('style of district that is missing data returns stripes', () => {
    M.processedData = mockData;
    style = M.getOptions().style(mockFeature(1906));
    expect(style.fillColor).toEqual('#707070');
    expect(style.weight).toBe(1);
    expect(style.opacity).toBe(1);
    expect(style.color).toBe('#b3b3b3');
    expect(style.fillOpacity).toBe(0.6);
    expect(style.fillPattern).toBe(M.stripes);
});

test('style of district with higher count than population returns gray', () => {
    M.processedData = mockData;
    style = M.getOptions().style(mockFeature(1907));
    expect(style.fillColor).toEqual('#707070');
    expect(style.weight).toBe(1);
    expect(style.opacity).toBe(1);
    expect(style.color).toBe('#b3b3b3');
    expect(style.fillOpacity).toBe(0.6);
    expect(style.fillPattern).toBeFalsy();
});

test('popup of non-errored district shows normal popup', () => {
    M.processedData = mockData;
    var layer = { bindPopup : jest.fn() };
    M.getOptions().onEachFeature(mockFeature(1902), layer);
    expect(layer.bindPopup).toBeCalledWith("<span class='popup-text'>In <b>Test District " +
        "Name</b>, the 43 <b>Black/African American Students</b> received " +
        "15.22% of the 46 <b>Out of School Suspensions</b> and represented " +
        "6.91% of the district population.</span>");
});

test('popup of non-errored district shows normal popup 2', () => {
    M.processedData = mockData;
    var layer = { bindPopup : jest.fn() };
    M.getOptions().onEachFeature(mockFeature(1904), layer);
    expect(layer.bindPopup).toBeCalledWith("<span class='popup-text'>In <b>Test District " +
        "Name</b>, the 100 <b>Black/African American Students</b> received " +
        "2.17% of the 46 <b>Out of School Suspensions</b> and represented " +
        "16.08% of the district population.</span>");
});

test('popup of non-errored district shows normal popup 3', () => {
    M.processedData = mockData;
    var layer = { bindPopup : jest.fn() };
    M.getOptions().onEachFeature(mockFeature(1905), layer);
    expect(layer.bindPopup).toBeCalledWith("<span class='popup-text'>In <b>Test District " +
        "Name</b>, the 43 <b>Black/African American Students</b> received " +
        "15.22% of the 46 <b>Out of School Suspensions</b> and represented " +
        "6.91% of the district population.</span>");
});

test('popup of non-errored district with count of 0 shows normal popup', () => {
    M.processedData = mockData;
    var layer = { bindPopup : jest.fn() };
    M.getOptions().onEachFeature(mockFeature(1908), layer);
    expect(layer.bindPopup).toBeCalledWith("<span class='popup-text'>In <b>Test District " +
        "Name</b>, the 3 <b>Black/African American Students</b> received " +
        "0% of the 46 <b>Out of School Suspensions</b> and represented " +
        "0.48% of the district population.</span>");
});

test('popup of district that does not exist shows data not available error', () => {
    M.processedData = mockData;
    var layer = { bindPopup : jest.fn() };
    M.getOptions().onEachFeature(mockFeature(101), layer);
    expect(layer.bindPopup).toBeCalledWith("<span class='popup-text'>Data not available " +
        "in <b>Test District Name</b> for " +
        "<b>Black/African American Students</b> in the <b>2015-2016</b> " +
        "school year.</span>");
});

test('popup of district missing data shows data not available error', () => {
    M.processedData = mockData;
    var layer = { bindPopup : jest.fn() };
    M.getOptions().onEachFeature(mockFeature(1906), layer);
    expect(layer.bindPopup).toBeCalledWith("<span class='popup-text'>Data not available " +
        "in <b>Test District Name</b> for " +
        "<b>Black/African American Students</b> in the <b>2015-2016</b> " +
        "school year.</span>");
});

test('popup of district with higher count than population shows error', () => {
    M.processedData = mockData;
    var layer = { bindPopup : jest.fn() };
    M.getOptions().onEachFeature(mockFeature(1907), layer);
    expect(layer.bindPopup).toBeCalledWith("<span class='popup-text'>The statistics for <b>Test District Name</b> appear " +
        "to have an <b>error</b>. They report that there were 0 <b>Black/African American " +
        "Students</b> and that they received 1 <b>Out of School Suspensions</b>, out of a district total " +
        "of fewer than 10.</span>");
});
