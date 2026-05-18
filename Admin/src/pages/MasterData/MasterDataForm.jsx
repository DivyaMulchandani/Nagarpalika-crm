import React, { useState, useEffect, useContext } from "react";
import {
  Card, CardBody, CardHeader, Col, Container, Row,
  Form, Input, Label, Button,
} from "reactstrap";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { createMasterData, updateMasterData, getMasterDataById } from "../../api/masterData.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";

const categories = [
  { id: "TITLE", name: "Titles" },
  { id: "GENDER", name: "Gender" },
  { id: "BLOOD_GROUP", name: "Blood Groups" },
  { id: "MARITAL_STATUS", name: "Marital Status" },
  { id: "RELATIONSHIP_TYPE", name: "Relationship Types" },
  { id: "ID_PROOF_TYPE", name: "ID Proof Types" },
  { id: "OCCUPATION_TYPE", name: "Occupation Types" },
  { id: "REFERRAL_SOURCE", name: "Referral Sources" },
  { id: "CHIEF_COMPLAINT", name: "Chief Complaints" },
  { id: "DIAGNOSIS", name: "Diagnosis / Conditions" },
  { id: "PROCEDURE", name: "Procedures / Treatments" },
  { id: "MEDICINE_FREQUENCY", name: "Medicine Frequencies" },
  { id: "MEDICINE_DOSAGE_UNIT", name: "Medicine Dosage Units" },
  { id: "MEDICINE_DURATION_UNIT", name: "Medicine Duration Units" },
  { id: "ALLERGY_TYPE", name: "Allergy Types" },
  { id: "VITAL_SIGN", name: "Vital Signs" },
  { id: "CLINICAL_NOTE_TYPE", name: "Clinical Note Types" },
  { id: "APPOINTMENT_TYPE", name: "Appointment Types" },
  { id: "APPOINTMENT_SOURCE", name: "Appointment Sources" },
  { id: "CANCELLATION_REASON", name: "Cancellation Reasons" },
  { id: "TIME_SLOT_DURATION", name: "Time Slot Durations" },
  { id: "PAYMENT_METHOD", name: "Payment Methods" },
  { id: "DISCOUNT_TYPE", name: "Discount Types" },
  { id: "TAX_TYPE", name: "Tax Types" },
  { id: "TAX_RATE", name: "Tax Rates" },
  { id: "CLINIC_TYPE", name: "Clinic Types" },
  { id: "WORKING_DAY", name: "Working Days" },
  { id: "HOLIDAY_TYPE", name: "Holiday Types" },
  { id: "FILE_UPLOAD_CATEGORY", name: "File Upload Categories" },
  { id: "TOOTH_NUMBER", name: "Tooth Numbers" },
  { id: "TOOTH_SURFACE", name: "Tooth Surfaces" },
  { id: "TOOTH_CONDITION", name: "Tooth Conditions" },
];

const initialState = { category: "TITLE", code: "", label: "", description: "", order: 0, isActive: true, metadata: "{}" };

const MasterDataForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions } = useContext(MenuContext);

  const isEdit = !!id && location.pathname.endsWith("/edit");
  const isView = !!id && !location.pathname.endsWith("/edit");

  const categoryFromQuery = searchParams.get("category") || "TITLE";
  const [values, setValues] = useState({ ...initialState, category: categoryFromQuery });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmit, setIsSubmit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (id) {
      setIsFetching(true);
      getMasterDataById(id)
        .then((res) => {
          const item = res.data.data;
          setValues({
            category: item.category,
            code: item.code,
            label: item.label,
            description: item.description || "",
            order: item.order || 0,
            isActive: item.isActive,
            metadata: JSON.stringify(item.metadata || {}, null, 2),
          });
        })
        .catch(() => toast.error("Failed to fetch details"))
        .finally(() => setIsFetching(false));
    }
  }, [id]);

  const validate = (v) => {
    const errors = {};
    if (!v.code) errors.code = "Code is required!";
    if (!v.label) errors.label = "Label is required!";
    try { JSON.parse(v.metadata); } catch { errors.metadata = "Metadata must be valid JSON"; }
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
    const payload = { ...values, metadata: JSON.parse(values.metadata || "{}") };
    const action = isEdit ? updateMasterData(id, payload) : createMasterData(payload);
    action
      .then((res) => {
        if (res.data.isOk) {
          toast.success(isEdit ? "Updated Successfully!" : "Added Successfully!");
          navigate("/master-data");
        }
      })
      .catch((err) => toast.error(err.response?.data?.message || `Failed to ${isEdit ? "update" : "add"}. Please try again.`))
      .finally(() => setIsLoading(false));
  };

  const categoryName = categories.find((c) => c.id === values.category)?.name || values.category;
  const title = isEdit ? `Edit ${categoryName}` : isView ? `View ${categoryName}` : `Add ${categoryName}`;
  document.title = `${title} | ${adminData?.companyName}`;

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb maintitle="Setup" title={title} pageTitle="Master Data" />
        <Row>
          <Col lg={8}>
            <Card>
              <CardHeader className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">{title}</h5>
                {isView && currentPagePermissions?.edit && (
                  <Button color="success" size="sm" onClick={() => navigate(`/master-data/${id}/edit`)}>
                    <i className="ri-edit-line me-1"></i>Edit
                  </Button>
                )}
              </CardHeader>
              <CardBody>
                {isFetching ? (
                  <div className="text-center py-4"><span className="spinner-border spinner-border-sm"></span></div>
                ) : (
                  <Form>
                    <Row>
                      <Col md={6}>
                        <div className="form-floating mb-3">
                          <Input type="text" name="code" value={values.code} onChange={handleChange} disabled={isView} placeholder="Code" />
                          <Label>Code <span className="text-danger">*</span></Label>
                          {isSubmit && <p className="text-danger">{formErrors.code}</p>}
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className="form-floating mb-3">
                          <Input type="text" name="label" value={values.label} onChange={handleChange} disabled={isView} placeholder="Label" />
                          <Label>Label <span className="text-danger">*</span></Label>
                          {isSubmit && <p className="text-danger">{formErrors.label}</p>}
                        </div>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={12}>
                        <div className="form-floating mb-3">
                          <Input type="textarea" name="description" value={values.description} onChange={handleChange} disabled={isView} style={{ height: "80px" }} placeholder="Description" />
                          <Label>Description</Label>
                        </div>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={6}>
                        <div className="form-floating mb-3">
                          <Input type="number" name="order" value={values.order} onChange={handleChange} disabled={isView} placeholder="Order" />
                          <Label>Order / Sequence</Label>
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className="mt-3">
                          <Input type="checkbox" className="form-check-input" name="isActive" checked={values.isActive} onChange={handleCheck} disabled={isView} />
                          <Label className="form-check-label ms-1">Is Active</Label>
                        </div>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={12}>
                        <div className="mb-3">
                          <Label>Metadata (JSON)</Label>
                          <Input type="textarea" name="metadata" value={values.metadata} onChange={handleChange} disabled={isView} rows="3" className="font-monospace" />
                          {isSubmit && <p className="text-danger">{formErrors.metadata}</p>}
                          <small className="text-muted">Used for additional properties like defaultCost.</small>
                        </div>
                      </Col>
                    </Row>

                    {!isView ? (
                      <div className="hstack gap-2 mt-4">
                        <Button color="success" onClick={handleSubmit} disabled={isLoading}>
                          {isLoading ? <><span className="spinner-border spinner-border-sm me-1"></span>{isEdit ? "Updating..." : "Submitting..."}</> : isEdit ? "Update" : "Submit"}
                        </Button>
                        <Button color="outline-danger" onClick={() => navigate("/master-data")} disabled={isLoading}>Cancel</Button>
                      </div>
                    ) : (
                      <div className="hstack gap-2 mt-4">
                        <Button color="secondary" onClick={() => navigate("/master-data")}>Back to List</Button>
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

export default MasterDataForm;
