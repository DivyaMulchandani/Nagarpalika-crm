import React, { useState, useEffect, useContext } from "react";
import {
  Card, CardBody, CardHeader, Col, Container, Row,
  Form, Input, Label, Button,
} from "reactstrap";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { createLanguage, updateLanguage, getLanguageById } from "../../api/languages.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";

const initialState = { name: "", order: 0, isActive: true };

const LanguageForm = () => {
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
      getLanguageById(id)
        .then((res) => {
          const d = res.data.data;
          setValues({ name: d.name, order: d.order ?? 0, isActive: d.isActive });
        })
        .catch(() => toast.error("Failed to fetch language details"))
        .finally(() => setIsFetching(false));
    }
  }, [id]);

  const validate = (v) => {
    const errors = {};
    if (!v.name?.trim()) errors.name = "Name is required!";
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
    const payload = { ...values, order: Number(values.order) || 0 };
    const action = isEdit ? updateLanguage(id, payload) : createLanguage(payload);
    action
      .then((res) => {
        if (res.data.isOk) {
          toast.success(isEdit ? "Language updated successfully!" : "Language added successfully!");
          navigate("/language");
        }
      })
      .catch((err) => toast.error(err?.response?.data?.message || `Failed to ${isEdit ? "update" : "add"} language.`))
      .finally(() => setIsLoading(false));
  };

  const title = isEdit ? "Edit Language" : isView ? "View Language" : "Add Language";
  document.title = `${title} | ${adminData?.companyName}`;

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb maintitle="Master" title={title} pageTitle="Language" pageTitlePath="/language" />
        <Row>
          <Col lg={6}>
            <Card>
              <CardHeader className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">{title}</h5>
                {isView && currentPagePermissions.edit && (
                  <Button color="success" size="sm" onClick={() => navigate(`/language/${id}/edit`)}>
                    <i className="ri-edit-line me-1"></i>Edit
                  </Button>
                )}
              </CardHeader>
              <CardBody>
                {isFetching ? (
                  <div className="text-center py-4"><span className="spinner-border spinner-border-sm"></span></div>
                ) : (
                  <Form onSubmit={handleSubmit}>
                    <div className="form-floating mb-3">
                      <Input
                        type="text"
                        name="name"
                        value={values.name}
                        onChange={handleChange}
                        disabled={isView}
                        placeholder="Language Name"
                      />
                      <Label>Name <span className="text-danger">*</span></Label>
                      {isSubmit && <p className="text-danger mt-1 mb-0" style={{ fontSize: 12 }}>{formErrors.name}</p>}
                    </div>

                    <div className="form-floating mb-3">
                      <Input
                        type="number"
                        name="order"
                        value={values.order}
                        onChange={handleChange}
                        disabled={isView}
                        placeholder="Order"
                      />
                      <Label>Order</Label>
                    </div>

                    <div className="mb-3 d-flex align-items-center gap-2">
                      <Input
                        type="checkbox"
                        className="form-check-input"
                        name="isActive"
                        id="isActive"
                        checked={values.isActive}
                        onChange={handleCheck}
                        disabled={isView}
                      />
                      <Label className="form-check-label mb-0" htmlFor="isActive">Is Active</Label>
                    </div>

                    {!isView ? (
                      <div className="hstack gap-2 mt-4">
                        <Button color="success" type="submit" disabled={isLoading}>
                          {isLoading ? (
                            <><span className="spinner-border spinner-border-sm me-1"></span>{isEdit ? "Updating..." : "Submitting..."}</>
                          ) : (
                            isEdit ? "Update" : "Submit"
                          )}
                        </Button>
                        <Button color="outline-danger" type="button" onClick={() => navigate("/language")} disabled={isLoading}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="hstack gap-2 mt-4">
                        <Button color="secondary" onClick={() => navigate("/language")}>Back to List</Button>
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

export default LanguageForm;
