import React, { useState, useEffect, useContext } from "react";
import {
  Card, CardBody, CardHeader, Col, Container, Row,
  Form, Input, Label, Button,
} from "reactstrap";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { createCity, updateCity, getCityById, getAllCountries, getAllStates } from "../../api/locations.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";

const initialState = { countryId: "", stateId: "", cityName: "", cityCode: "", isActive: true };

const CityForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions } = useContext(MenuContext);

  const isEdit = !!id && location.pathname.endsWith("/edit");
  const isView = !!id && !location.pathname.endsWith("/edit");

  const [values, setValues] = useState(initialState);
  const [countryList, setCountryList] = useState([]);
  const [stateList, setStateList] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmit, setIsSubmit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    getAllCountries().then((res) => setCountryList(res.data.data)).catch(console.error);
    getAllStates().then((res) => setStateList(res.data.data)).catch(console.error);
    if (id) {
      setIsFetching(true);
      getCityById(id)
        .then((res) => {
          const d = res.data.data;
          setValues({ countryId: d.countryId, stateId: d.stateId, cityName: d.cityName, cityCode: d.cityCode, isActive: d.isActive });
        })
        .catch(() => toast.error("Failed to fetch city details"))
        .finally(() => setIsFetching(false));
    }
  }, [id]);

  const validate = (v) => {
    const errors = {};
    if (!v.countryId) errors.countryId = "Country is required!";
    if (!v.stateId) errors.stateId = "State is required!";
    if (!v.cityName) errors.cityName = "City Name is required!";
    if (!v.cityCode) errors.cityCode = "City Code is required!";
    return errors;
  };

  const handleChange = (e) => setValues({ ...values, [e.target.name]: e.target.value });
  const handleCheck = (e) => setValues({ ...values, isActive: e.target.checked });

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validate(values);
    setFormErrors(errors);
    setIsSubmit(true);
    if (Object.keys(errors).length > 0) return;

    setIsLoading(true);
    const action = isEdit ? updateCity(id, values) : createCity(values);
    action
      .then((res) => {
        if (res.data.isOk) {
          toast.success(isEdit ? "City Updated Successfully!" : "City Added Successfully!");
          navigate("/city");
        }
      })
      .catch(() => toast.error(`Failed to ${isEdit ? "update" : "add"} city. Please try again.`))
      .finally(() => setIsLoading(false));
  };

  const filteredStates = stateList.filter((s) => s.countryId?._id === values.countryId || s.countryId === values.countryId);

  const title = isEdit ? "Edit City" : isView ? "View City" : "Add City";
  document.title = `${title} | ${adminData?.companyName}`;

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb maintitle="Master" title={title} pageTitle="City" pageTitlePath="/city" />
        <Row>
          <Col lg={6}>
            <Card>
              <CardHeader className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">{title}</h5>
                {isView && currentPagePermissions.edit && (
                  <Button color="success" size="sm" onClick={() => navigate(`/city/${id}/edit`)}>
                    <i className="ri-edit-line me-1"></i>Edit
                  </Button>
                )}
              </CardHeader>
              <CardBody>
                {isFetching ? (
                  <div className="text-center py-4"><span className="spinner-border spinner-border-sm"></span></div>
                ) : (
                  <Form>
                    <div className="mb-3">
                      <Label>Country <span className="text-danger">*</span></Label>
                      <select className="form-select" name="countryId" value={values.countryId} onChange={handleChange} disabled={isView}>
                        <option value="">Select Country</option>
                        {countryList.map((c) => <option key={c._id} value={c._id}>{c.countryName}</option>)}
                      </select>
                      {isSubmit && <p className="text-danger">{formErrors.countryId}</p>}
                    </div>

                    <div className="mb-3">
                      <Label>State <span className="text-danger">*</span></Label>
                      <select className="form-select" name="stateId" value={values.stateId} onChange={handleChange} disabled={isView}>
                        <option value="">Select State</option>
                        {filteredStates.map((s) => <option key={s._id} value={s._id}>{s.stateName}</option>)}
                      </select>
                      {isSubmit && <p className="text-danger">{formErrors.stateId}</p>}
                    </div>

                    <div className="form-floating mb-3">
                      <Input type="text" name="cityName" value={values.cityName} onChange={handleChange} disabled={isView} placeholder="City Name" />
                      <Label>City Name <span className="text-danger">*</span></Label>
                      {isSubmit && <p className="text-danger">{formErrors.cityName}</p>}
                    </div>

                    <div className="form-floating mb-3">
                      <Input type="text" name="cityCode" value={values.cityCode} onChange={handleChange} disabled={isView} placeholder="City Code" />
                      <Label>City Code <span className="text-danger">*</span></Label>
                      {isSubmit && <p className="text-danger">{formErrors.cityCode}</p>}
                    </div>

                    <div className="mb-3">
                      <Input type="checkbox" className="form-check-input" name="isActive" checked={values.isActive} onChange={handleCheck} disabled={isView} />
                      <Label className="form-check-label ms-1">Is Active</Label>
                    </div>

                    {!isView ? (
                      <div className="hstack gap-2 mt-4">
                        <Button color="success" onClick={handleSubmit} disabled={isLoading}>
                          {isLoading ? <><span className="spinner-border spinner-border-sm me-1"></span>{isEdit ? "Updating..." : "Submitting..."}</> : isEdit ? "Update" : "Submit"}
                        </Button>
                        <Button color="outline-danger" onClick={() => navigate("/city")} disabled={isLoading}>Cancel</Button>
                      </div>
                    ) : (
                      <div className="hstack gap-2 mt-4">
                        <Button color="secondary" onClick={() => navigate("/city")}>Back to List</Button>
                      </div>
                    )}
                  </Form>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default CityForm;
