# try moving tests to tests/ and using "python -m pytest tests/"
# not just "pytest tests.py"

import pytest

from . import LoadFromFile

@pytest.fixture()
def load_year_for_testing():
    return LoadFromFile.get_year(2008)

def test_load_one_year(load_year_for_testing):
    assert load_year_for_testing[0][0] == 'DISTRICT'
    assert int(load_year_for_testing[1][0]) == 31901
    assert len(load_year_for_testing) == 74271

SHORT_DATA = [["DISTRICT","SECTION","HEADING","HEADING NAME","YR08"],
            ["184907","G-IN SCHOOL SUSPENSIONS","C24","NATIVE AMERICAN","14"],
            ["184907","G-IN SCHOOL SUSPENSIONS","C25","WHITE","509"],
            ["184907","I-SPEC. ED. EXPULSIONS","D04","SPEC. ED. STUDENTS EXPELLED","-99999999"]]

def test_filter_year_by_column(load_year_for_testing):
    assert len(LoadFromFile.filter_year_by_column(
                SHORT_DATA, "SECTION", 
                ("IN SCHOOL SUSPENSION", "OUT OF SCHOOL SUSPENSIONS"), 
                keep_matches=True)) == 3
    
    assert len(LoadFromFile.filter_year_by_column(
            load_year_for_testing, "SECTION", 
            ("IN SCHOOL SUSPENSION", "OUT OF SCHOOL SUSPENSIONS"), 
            keep_matches=True)) == 6569