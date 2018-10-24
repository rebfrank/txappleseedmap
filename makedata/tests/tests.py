# use pytest tests/tests.py

import pytest
import os

from makedata import collectFromFile

@pytest.fixture()
def load_year_for_testing():
    return collectFromFile.get_year(2009)

@pytest.fixture()
def load_charter_list():
    return collectFromFile.get_charters()

@pytest.fixture()
def load_empty_dict():
    return collectFromFile.make_empty_dict(2006, 2016)

@pytest.fixture()
def load_year_list():
    return collectFromFile.make_year_of_records(2009)

@pytest.fixture()
def load_dict_with_year(load_empty_dict):
    return collectFromFile.add_year_to_dict(2009, load_empty_dict)

@pytest.fixture()
def load_dict_with_year_charters(load_empty_dict):
    return collectFromFile.add_year_to_dict(2009,
                                            load_empty_dict,
                                            True, False)

@pytest.fixture()
def dump_dict_to_dir(load_dict_with_year, tmpdir, monkeypatch):
    def _test_helper(first_year, last_year, include_charters,
                        include_traditional, test_data_dir_exists = False):
        fake_proj_dir = tmpdir.mkdir('test_dir')
        fake_src_file = fake_proj_dir.mkdir('makedata').join('fake_src.py')
        if test_data_dir_exists:
            fake_data_dir = fake_proj_dir.mkdir('data')
        with monkeypatch.context() as m:
            monkeypatch.setattr(collectFromFile, "__file__", fake_src_file)
            collectFromFile.dict_to_json(load_dict_with_year, first_year,
            last_year, include_charters, include_traditional)
        return fake_proj_dir

    return _test_helper

def test_load_one_year():
    assert load_year_for_testing()[0][0] == 'DISTRICT'
    assert int(load_year_for_testing()[1][0]) == 31901
    assert len(load_year_for_testing()) == 73692

SHORT_DATA = [["DISTRICT","SECTION","HEADING","HEADING NAME","YR08"],
            ["184907","G-IN SCHOOL SUSPENSIONS","C24","NATIVE AMERICAN","14"],
            ["184907","G-IN SCHOOL SUSPENSIONS","C25","WHITE","509"],
            ["184907","I-SPEC. ED. EXPULSIONS","D04",
                "SPEC. ED. STUDENTS EXPELLED","-99999999"],
            ["126901", "F-OUT OF SCHOOL SUSPENSIONS", "C16",
                "AFRICAN AMERICAN", "-99999999"],
            ["126901","B-DISCIPLINE DATA TRENDS","B03",
                "DISCRETIONARY EXPULSIONS TO JJAEP","-99999999"],
            ["126901","B-DISCIPLINE DATA TRENDS","B04",
                "COUNT OF STUDENTS EXPELLED","-99999999"]]

def test_relabel_mandatory_and_discretionary():
    assert collectFromFile.mandatory_and_discretionary(
            SHORT_DATA,2,3,1)[-2][1] == "B-DISCIPLINE DATA TRENDS"
    assert collectFromFile.mandatory_and_discretionary(
            SHORT_DATA,2,3,1)[-1][1] == "EXP"
    assert collectFromFile.mandatory_and_discretionary(
            SHORT_DATA,2,3,1)[-1][3] == "CNT"

def test_filter_year_by_column(load_year_for_testing):
    assert len(collectFromFile.filter_year_by_column(
        SHORT_DATA, 1,
        ("IN SCHOOL SUSPENSION", "OUT OF SCHOOL SUSPENSIONS"),
        keep_matches=True)) == 4

    assert len(collectFromFile.filter_year_by_column(
        load_year_for_testing, 1,
        ("IN SCHOOL SUSPENSION", "OUT OF SCHOOL SUSPENSIONS"),
        keep_matches=True)) == 6583

def test_int_values_for_row():
    assert collectFromFile.number_strings_to_int(SHORT_DATA[-1]) == [126901,
        "F-OUT OF SCHOOL SUSPENSIONS", "C16", "AFRICAN AMERICAN", 1]

def test_replace_category_names_for_sample_data():
    assert collectFromFile.replace_category_names(SHORT_DATA, 3, 1)[1][1] \
            == "ISS"
    assert collectFromFile.replace_category_names(SHORT_DATA, 3, 1)[2][3] \
            == "WHI"

def test_replace_category_names_for_one_year():
    a = load_year_for_testing()
    a = collectFromFile.mandatory_and_discretionary(a,2,3,1)
    a = collectFromFile.filter_records(a,3,1)
    a = collectFromFile.replace_category_names(a,3,1)
    assert max(len(row[1]) for row in a[1:]) == 3

def test_get_demo_year():
    assert collectFromFile.get_demo_year(2009)["BLA"][5902] == 1
    assert collectFromFile.get_demo_year(2009)["WHI"][5902] == 93

def test_get_charters():
    assert 14803 in collectFromFile.get_charters()

def test_impossible_statistics():
    assert not collectFromFile.impossible(8, 2, 10, 100)
    assert collectFromFile.impossible(8, 20, 0, 100)

def test_add_year_exclude_charters(load_dict_with_year):
    year = 2009
    assert 14803 not in load_dict_with_year[2009]["ALL"]["POP"].keys()
    assert load_dict_with_year[year]["HIS"]["DAE"][31912]["C"] == 349

def test_add_year_include_charters(load_dict_with_year_charters):
    year = 2009
    assert 14803 in load_dict_with_year_charters[year]["ALL"]["POP"].keys()
    assert 31912 not in load_dict_with_year_charters[year]["HIS"]["DAE"].keys()

def test_punishment_totals_for_year(load_dict_with_year):
    year = 2009
    action = "DAE"
    assert 31912 in set(load_dict_with_year[year]["WHI"][action].keys() |
                            load_dict_with_year[year]["BLA"][action].keys())

    assert load_dict_with_year[year]["ALL"][action][31912]["C"] == \
            max(276+79, 43+312)
    assert load_dict_with_year[year]["ALL"]["EXP"][101909]["C"] == 6

def test_punishment_total_is_zero(load_dict_with_year):
    assert load_dict_with_year[2009]["WHI"]["EXP"][1909]["C"] == 0
    assert load_dict_with_year[2009]["ALL"]["EXP"][1909]["C"] == 0

def test_demo_populations_for_year(load_dict_with_year):
    year = 2009
    assert load_dict_with_year[year]["BLA"]["POP"][61906]["C"] == 26

def test_statewide_populations_for_year(load_dict_with_year):
    year = 2009
    assert load_dict_with_year[year]["ALL"]["POP"][0]["C"] == 5068223
    assert load_dict_with_year[year]["ASI"]["EXP"][0]["C"] == 34

def test_binomial_scaling_calculation():

    """
    binomial_scale(member_punishments: int,
                   all_punishments: int,
                   member_pop: int,
                   all_pop: int) -> int:
    """

    assert collectFromFile.binomial_scale(0, 50, 30, 100) == 0
    assert collectFromFile.binomial_scale(3, 50, 30, 100) == 2
    assert collectFromFile.binomial_scale(15, 50, 30, 100) == 5
    assert collectFromFile.binomial_scale(40, 50, 30, 100) == 10

def test_percentage_scaling_calculation():

    """
    Despite being many standard deviations from the mean of a random
    distribution, the group's punishment rate is less than 1.4 times the
    district population's rate, so it's score is 6,
    only one step above the middle score.
    """

    assert collectFromFile.binomial_scale(1300, 10000, 10000, 100000) == 6

    """
    In the next example, p/group_p == 1000/800 == 1.25
    """

    assert collectFromFile.binomial_scale(800, 10000, 10000, 100000) == 4

def test_add_scale_variable_to_dict(load_dict_with_year):
    year = 2009
    assert load_dict_with_year[year]["BLA"]["OSS"][101902]["S"] == 8

def test_calculate_districtwide_scale_variable(load_dict_with_year):
    year = 2009
    assert load_dict_with_year[year]["ALL"]["POP"][101914]["C"] == 59604
    assert load_dict_with_year[year]["ALL"]["ISS"][101914]["C"] == 8773
    assert load_dict_with_year[year]["ALL"]["ISS"][101914]["S"] == 1

def test_unavailable_scale_variable_omitted(load_dict_with_year):

    # If the scale can't be calculated, it should be omitted, not
    # left as a dummy or null.

    year = 2009
    assert "C" in load_dict_with_year[year]["ASI"]["ISS"][31901]
    assert "S" not in load_dict_with_year[year]["ASI"]["ISS"][31901]

def test_make_csv_row_demo(load_dict_with_year):
    assert collectFromFile.make_csv_row_demo(load_dict_with_year,
        2009, "BLA", "OSS", 101902) == [
            101902, 9333, 8, 20240, 17982, 67468]
    assert collectFromFile.make_csv_row_demo(load_dict_with_year,
        2009, "TWO", "EXP", 3903) == [
            3903, None, None, None, 12, 9346]

def test_make_csv_row_all(load_dict_with_year):
    assert collectFromFile.make_csv_row_all(load_dict_with_year,
        2009, "ALL", "OSS", 101902) == [
            101902, 17982, 9, 67468, 583121, 5068223]

def test_make_csv_row_no_actions(load_dict_with_year):
    assert collectFromFile.make_csv_row_all(load_dict_with_year,
        2009, "ALL", "EXP", 1909) == [
            1909, 0, 5, 443, 7196, 5068223]

def test_json_dump_path_creation(dump_dict_to_dir):
    d = dump_dict_to_dir(2010, 2012, False, True)
    assert os.path.exists(os.path.join(d, 'data', 'processed',
                                       'stpp2010-2012.json'))

def test_json_dump_path_exists(dump_dict_to_dir):
    d = dump_dict_to_dir(2010, 2012, False, True, test_data_dir_exists = True)
    assert os.path.exists(os.path.join(d, 'data', 'processed',
                                       'stpp2010-2012.json'))

def test_json_dump_path_one_year(dump_dict_to_dir):
    d = dump_dict_to_dir(2010, 2010, False, True, test_data_dir_exists = True)
    assert os.path.exists(os.path.join(d, 'data', 'processed',
                                       'stpp2010.json'))

def test_json_dump_charter_only(dump_dict_to_dir):
    d = dump_dict_to_dir(2010, 2012, True, False, test_data_dir_exists = True)
    assert os.path.exists(os.path.join(d, 'data', 'processed',
                                       'stppChartersOnly2010-2012.json'))

def test_json_dump_with_charters(dump_dict_to_dir):
    d = dump_dict_to_dir(2010, 2012, True, True, test_data_dir_exists = True)
    assert os.path.exists(os.path.join(d, 'data', 'processed',
                                       'stppWithCharters2010-2012.json'))

def test_report_nested_file_location():
    assert "through" not in collectFromFile.report_nested_file_location(2008, 2008)
    assert "through" in collectFromFile.report_nested_file_location(2006, 2016)
