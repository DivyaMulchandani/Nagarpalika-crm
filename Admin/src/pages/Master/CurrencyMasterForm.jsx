import React, { useState, useEffect, useContext } from "react";
import {
  Card, CardBody, CardHeader, Col, Container, Row,
  Form, Input, Label, Button,
} from "reactstrap";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { createCurrency, updateCurrency, getCurrencyById } from "../../api/currencies.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";

const initialState = { currencyName: "", currencyCode: "", currencySymbol: "", isActive: true };

const CurrencyMasterForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions } = useContext(MenuContext);

  const isEdit = !!id && location.pathname.endsWith("/edit");
  const isView = !!id && !location.pathname.endsWith("/edit");

  const [values, setValues] = useState(initialState);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmit, setIsSubmit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (id) {
      setIsFetching(true);
      getCurrencyById(id)
        .then((res) => {
          const d = res.data.data;
          setValues({ currencyName: d.currencyName, currencyCode: d.currencyCode, currencySymbol: d.currencySymbol, isActive: d.isActive });
        })
        .catch(() => toast.error("Failed to fetch currency details"))
        .finally(() => setIsFetching(false));
    }
  }, [id]);

  const validate = (v) => {
    const errors = {};
    if (!v.currencyName) errors.currencyName = "Currency Name is required!";
    if (!v.currencyCode) errors.currencyCode = "Currency Code is required!";
    if (!v.currencySymbol) errors.currencySymbol = "Currency Symbol is required!";
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
    const action = isEdit ? updateCurrency(id, values) : createCurrency(values);
    action
      .then((res) => {
        if (res.data.isOk) {
          toast.success(isEdit ? "Currency Updated Successfully!" : "Currency Added Successfully!");
          navigate("/currency-master");
        }
      })
      .catch(() => toast.error(`Failed to ${isEdit ? "update" : "add"} currency. Please try again.`))
      .finally(() => setIsLoading(false));
  };

  const title = isEdit ? "Edit Currency" : isView ? "View Currency" : "Add Currency";
  document.title = `${title} | ${adminData?.companyName}`;

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb maintitle="Master" title={title} pageTitle="Currency Master" />
        <Row>
          <Col lg={6}>
            <Card>
              <CardHeader className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">{title}</h5>
                {isView && currentPagePermissions.edit && (
                  <Button color="success" size="sm" onClick={() => navigate(`/currency-master/${id}/edit`)}>
                    <i className="ri-edit-line me-1"></i>Edit
                  </Button>
                )}
              </CardHeader>
              <CardBody>
                {isFetching ? (
                  <div className="text-center py-4"><span className="spinner-border spinner-border-sm"></span></div>
                ) : (
                  <Form>
                    <div className="form-floating mb-3">
                      <Input type="text" name="currencyName" value={values.currencyName} onChange={handleChange} disabled={isView} placeholder="Currency Name" />
                      <Label>Currency Name <span className="text-danger">*</span></Label>
                      {isSubmit && <p className="text-danger">{formErrors.currencyName}</p>}
                    </div>

                    <div className="form-floating mb-3">
                      <Input type="text" name="currencyCode" value={values.currencyCode} onChange={handleChange} disabled={isView} placeholder="Currency Code" />
                      <Label>Currency Code <span className="text-danger">*</span></Label>
                      {isSubmit && <p className="text-danger">{formErrors.currencyCode}</p>}
                    </div>

                    <div className="form-floating mb-3">
                      <Input type="text" name="currencySymbol" value={values.currencySymbol} onChange={handleChange} disabled={isView} placeholder="Currency Symbol" />
                      <Label>Currency Symbol <span className="text-danger">*</span></Label>
                      {isSubmit && <p className="text-danger">{formErrors.currencySymbol}</p>}
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
                        <Button color="outline-danger" onClick={() => navigate("/currency-master")} disabled={isLoading}>Cancel</Button>
                      </div>
                    ) : (
                      <div className="hstack gap-2 mt-4">
                        <Button color="secondary" onClick={() => navigate("/currency-master")}>Back to List</Button>
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

export default CurrencyMasterForm;
