import React, { useState, useEffect, useContext } from "react";
import {
  Card, CardBody, CardHeader, Col, Container, Row,
  Form, Input, Label, Button,
} from "reactstrap";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { createQualification, updateQualification, getQualificationById } from "../../api/qualifications.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";

const initialState = { name: "", type: "education", level: "", isActive: true };

const TYPE_OPTIONS = [
  { value: "education", label: "Education", help: "Shown in OTR \"Highest Qualification\". Give it a level." },
  { value: "certificate", label: "Certificate", help: "e.g. CCC, typing, licence — asked for only by advertisements that need it." },
  { value: "document", label: "Other document", help: "e.g. experience letter, NOC — asked for only by advertisements that need it." },
];

const QualificationForm = () => {
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
      getQualificationById(id)
        .then((res) => {
          const d = res.data.data;
          setValues({ name: d.name, type: d.type || "education", level: d.level ?? "", isActive: d.isActive });
        })
        .catch(() => toast.error("Failed to fetch qualification details"))
        .finally(() => setIsFetching(false));
    }
  }, [id]);

  const validate = (v) => {
    const errors = {};
    if (!v.name?.trim()) errors.name = "Name is required!";
    if (v.type === "education" && v.level !== "" && !(Number(v.level) >= 0 && Number(v.level) <= 99))
      errors.level = "Level must be a number from 0 to 99";
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
    const payload = { ...values, level: values.type === "education" && values.level !== "" ? Number(values.level) : "" };
    const action = isEdit ? updateQualification(id, payload) : createQualification(payload);
    action
      .then((res) => {
        if (res.data.isOk) {
          toast.success(isEdit ? "Qualification updated successfully!" : "Qualification added successfully!");
          navigate("/qualification");
        }
      })
      .catch((err) => toast.error(err?.response?.data?.message || `Failed to ${isEdit ? "update" : "add"} qualification.`))
      .finally(() => setIsLoading(false));
  };

  const title = isEdit ? "Edit Qualification" : isView ? "View Qualification" : "Add Qualification";
  document.title = `${title} | ${adminData?.companyName}`;

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb maintitle="Master" title={title} pageTitle="Qualification" pageTitlePath="/qualification" />
        <Row>
          <Col lg={6}>
            <Card>
              <CardHeader className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">{title}</h5>
                {isView && currentPagePermissions.edit && (
                  <Button color="success" size="sm" onClick={() => navigate(`/qualification/${id}/edit`)}>
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
                        placeholder="Qualification Name"
                      />
                      <Label>Name <span className="text-danger">*</span></Label>
                      {isSubmit && <p className="text-danger mt-1 mb-0" style={{ fontSize: 12 }}>{formErrors.name}</p>}
                    </div>

                    <div className="mb-3">
                      <Label className="mb-1">Type <span className="text-danger">*</span></Label>
                      <Input type="select" name="type" value={values.type} onChange={handleChange} disabled={isView}>
                        {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </Input>
                      <small className="text-muted">{TYPE_OPTIONS.find((t) => t.value === values.type)?.help}</small>
                    </div>
                    {values.type === "education" && (
                      <div className="mb-3">
                        <Label className="mb-1">Level</Label>
                        <Input type="number" min={0} max={99} name="level" value={values.level} onChange={handleChange} disabled={isView} placeholder="e.g. 10th = 1, 12th = 2, Graduation = 3" />
                        <small className="text-muted d-block">
                          Higher number = higher qualification. Entries with the same level count as equal (e.g. 12th and Diploma).
                          A candidate can apply only if their level is at or above the advertisement's minimum education.
                        </small>
                        {isSubmit && formErrors.level && <p className="text-danger mt-1 mb-0" style={{ fontSize: 12 }}>{formErrors.level}</p>}
                      </div>
                    )}
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
                        <Button color="outline-danger" type="button" onClick={() => navigate("/qualification")} disabled={isLoading}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="hstack gap-2 mt-4">
                        <Button color="secondary" onClick={() => navigate("/qualification")}>Back to List</Button>
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

export default QualificationForm;
