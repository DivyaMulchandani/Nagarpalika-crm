import React, { useState, useEffect, useContext } from "react";
import {
  Card, CardBody, CardHeader, Col, Container, Row,
  Form, Input, Label, Button,
} from "reactstrap";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { createDoctor, updateDoctor, getDoctorById } from "../../api/doctors.api";
import { getMasterData } from "../../api/masterData.api";
import { getAllRoles } from "../../api/roles.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import Select from "react-select";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";

const initialState = {
  doctorName: "",
  doctorCode: "",
  specializationId: "",
  qualifications: "",
  registrationNumber: "",
  email: "",
  password: "",
  mobileNumber: "",
  consultationFee: 0,
  followUpFee: 0,
  slotDurationId: "",
  roleId: "",
  isActive: true,
};

const DoctorForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions } = useContext(MenuContext);

  const isEdit = !!id && location.pathname.endsWith("/edit");
  const isView = !!id && !location.pathname.endsWith("/edit");

  const [values, setValues] = useState(initialState);
  const [selectedSpecialization, setSelectedSpecialization] = useState(null);
  const [selectedSlotDuration, setSelectedSlotDuration] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [specializationList, setSpecializationList] = useState([]);
  const [slotDurationList, setSlotDurationList] = useState([]);
  const [roleList, setRoleList] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmit, setIsSubmit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    getMasterData({ category: "SPECIALIZATION", isActive: true })
      .then((res) => { if (res.data.isOk) setSpecializationList(res.data.data || []); })
      .catch(() => {});
    getMasterData({ category: "TIME_SLOT_DURATION", isActive: true })
      .then((res) => { if (res.data.isOk) setSlotDurationList(res.data.data || []); })
      .catch(() => {});
    getAllRoles()
      .then((res) => { if (res.data.isOk) setRoleList(res.data.data || []); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (id) {
      setIsFetching(true);
      getDoctorById(id)
        .then((res) => {
          const d = res.data.data;
          setValues({
            doctorName: d.doctorName || "",
            doctorCode: d.doctorCode || "",
            specializationId: d.specializationId?._id || d.specializationId || "",
            qualifications: d.qualifications || "",
            registrationNumber: d.registrationNumber || "",
            email: d.email || "",
            password: "",
            mobileNumber: d.mobileNumber || "",
            consultationFee: d.consultationFee ?? 0,
            followUpFee: d.followUpFee ?? 0,
            slotDurationId: d.slotDurationId?._id || d.slotDurationId || "",
            roleId: d.roleId?._id || d.roleId || "",
            isActive: !!d.isActive,
          });
          if (d.specializationId) {
            const specId = d.specializationId._id || d.specializationId;
            const specLabel = d.specializationId.label || "";
            setSelectedSpecialization(specId ? { value: specId, label: specLabel } : null);
          }
          if (d.slotDurationId) {
            const slotId = d.slotDurationId._id || d.slotDurationId;
            const slotLabel = d.slotDurationId.label || "";
            setSelectedSlotDuration(slotId ? { value: slotId, label: slotLabel } : null);
          }
          if (d.roleId) {
            const rId = d.roleId._id || d.roleId;
            const rLabel = d.roleId.roleName || "";
            setSelectedRole(rId ? { value: rId, label: rLabel } : null);
          }
        })
        .catch(() => toast.error("Failed to fetch doctor details"))
        .finally(() => setIsFetching(false));
    }
  }, [id]);

  const validate = (v) => {
    const errors = {};
    if (!v.doctorName?.trim()) errors.doctorName = "Doctor Name is required!";
    if (!v.doctorCode?.trim()) errors.doctorCode = "Doctor Code is required!";
    if (!v.email?.trim()) errors.email = "Email is required!";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) errors.email = "Enter a valid email!";
    if (!isEdit && !v.password?.trim()) errors.password = "Password is required!";
    if (!isEdit && v.password && v.password.length < 6) errors.password = "Password must be at least 6 characters!";
    if (v.mobileNumber?.trim() && !/^[+\d\s\-()]+$/.test(v.mobileNumber)) errors.mobileNumber = "Enter a valid mobile number!";
    if (v.consultationFee !== "" && Number(v.consultationFee) < 0) errors.consultationFee = "Fee cannot be negative!";
    if (v.followUpFee !== "" && Number(v.followUpFee) < 0) errors.followUpFee = "Fee cannot be negative!";
    return errors;
  };

  const handleChange = (e) => setValues({ ...values, [e.target.name]: e.target.value });
  const handleNumberChange = (e) => setValues({ ...values, [e.target.name]: e.target.value === "" ? "" : Number(e.target.value) });
  const handleCheck = (e) => setValues({ ...values, isActive: e.target.checked });

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validate(values);
    setFormErrors(errors);
    setIsSubmit(true);
    if (Object.keys(errors).length > 0) return;

    setIsLoading(true);
    const payload = { ...values };
    // Don't send empty password on edit
    if (isEdit && !payload.password) {
      delete payload.password;
    }

    const action = isEdit ? updateDoctor(id, payload) : createDoctor(payload);
    action
      .then((res) => {
        if (res.data.isOk) {
          toast.success(isEdit ? "Doctor Updated Successfully!" : "Doctor Added Successfully!");
          navigate("/doctor");
        } else {
          toast.error(res.data.message || `Failed to ${isEdit ? "update" : "add"} doctor`);
        }
      })
      .catch((err) => toast.error(err?.response?.data?.message || `Failed to ${isEdit ? "update" : "add"} doctor. Please try again.`))
      .finally(() => setIsLoading(false));
  };

  const title = isEdit ? "Edit Doctor" : isView ? "View Doctor" : "Add Doctor";
  document.title = `${title} | ${adminData?.companyName}`;

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb maintitle="Setup" title={title} pageTitle="Doctor" />
        <Row>
          <Col lg={10}>
            <Card>
              <CardHeader className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">{title}</h5>
                {isView && currentPagePermissions.edit && (
                  <Button color="success" size="sm" onClick={() => navigate(`/doctor/${id}/edit`)}>
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
                          <Input type="text" name="doctorName" value={values.doctorName} onChange={handleChange} disabled={isView} placeholder="Doctor Name" />
                          <Label>Doctor Name <span className="text-danger">*</span></Label>
                          {isSubmit && <p className="text-danger">{formErrors.doctorName}</p>}
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className="form-floating mb-3">
                          <Input type="text" name="doctorCode" value={values.doctorCode} onChange={handleChange} disabled={isView} placeholder="Doctor Code" />
                          <Label>Doctor Code <span className="text-danger">*</span></Label>
                          {isSubmit && <p className="text-danger">{formErrors.doctorCode}</p>}
                        </div>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={6}>
                        <div className="form-floating mb-3">
                          <Input type="email" name="email" value={values.email} onChange={handleChange} disabled={isView} placeholder="Email" />
                          <Label>Login Email <span className="text-danger">*</span></Label>
                          {isSubmit && <p className="text-danger">{formErrors.email}</p>}
                        </div>
                      </Col>
                      <Col md={6}>
                        {!isView && (
                          <div className="form-floating mb-3">
                            <Input type="password" name="password" value={values.password} onChange={handleChange} placeholder="Password" />
                            <Label>{isEdit ? "New Password (leave blank to keep)" : "Password"} {!isEdit && <span className="text-danger">*</span>}</Label>
                            {isSubmit && <p className="text-danger">{formErrors.password}</p>}
                          </div>
                        )}
                      </Col>
                    </Row>

                    <Row>
                      <Col md={6}>
                        <div className="mb-3">
                          <Label>Specialization</Label>
                          <Select
                            options={specializationList.map((s) => ({ value: s._id, label: s.label }))}
                            value={selectedSpecialization}
                            onChange={(opt) => { setSelectedSpecialization(opt); setValues({ ...values, specializationId: opt ? opt.value : "" }); }}
                            isClearable
                            isDisabled={isView}
                            placeholder="Select specialization"
                          />
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className="form-floating mb-3">
                          <Input type="text" name="qualifications" value={values.qualifications} onChange={handleChange} disabled={isView} placeholder="Qualifications" />
                          <Label>Qualifications</Label>
                        </div>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={6}>
                        <div className="form-floating mb-3">
                          <Input type="text" name="registrationNumber" value={values.registrationNumber} onChange={handleChange} disabled={isView} placeholder="Registration Number" />
                          <Label>Medical Council Registration No.</Label>
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className="form-floating mb-3">
                          <Input type="text" name="mobileNumber" value={values.mobileNumber} onChange={handleChange} disabled={isView} placeholder="Mobile Number" />
                          <Label>Mobile Number</Label>
                          {isSubmit && <p className="text-danger">{formErrors.mobileNumber}</p>}
                        </div>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={6}>
                        <div className="mb-3">
                          <Label>Slot Duration</Label>
                          <Select
                            options={slotDurationList.map((s) => ({ value: s._id, label: s.label }))}
                            value={selectedSlotDuration}
                            onChange={(opt) => { setSelectedSlotDuration(opt); setValues({ ...values, slotDurationId: opt ? opt.value : "" }); }}
                            isClearable
                            isDisabled={isView}
                            placeholder="Select slot duration"
                          />
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className="mb-3">
                          <Label>Role (for menu permissions)</Label>
                          <Select
                            options={roleList.map((r) => ({ value: r._id, label: r.roleName }))}
                            value={selectedRole}
                            onChange={(opt) => { setSelectedRole(opt); setValues({ ...values, roleId: opt ? opt.value : "" }); }}
                            isClearable
                            isDisabled={isView}
                            placeholder="Select role"
                          />
                        </div>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={6}>
                        <div className="form-floating mb-3">
                          <Input type="number" min="0" step="0.01" name="consultationFee" value={values.consultationFee} onChange={handleNumberChange} disabled={isView} placeholder="Consultation Fee" />
                          <Label>Consultation Fee</Label>
                          {isSubmit && <p className="text-danger">{formErrors.consultationFee}</p>}
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className="form-floating mb-3">
                          <Input type="number" min="0" step="0.01" name="followUpFee" value={values.followUpFee} onChange={handleNumberChange} disabled={isView} placeholder="Follow-up Fee" />
                          <Label>Follow-up Fee</Label>
                          {isSubmit && <p className="text-danger">{formErrors.followUpFee}</p>}
                        </div>
                      </Col>
                    </Row>

                    <div className="mb-3">
                      <Input type="checkbox" className="form-check-input" name="isActive" checked={values.isActive} onChange={handleCheck} disabled={isView} />
                      <Label className="form-check-label ms-1">Is Active</Label>
                    </div>

                    {!isView ? (
                      <div className="hstack gap-2 mt-4">
                        <Button color="success" onClick={handleSubmit} disabled={isLoading}>
                          {isLoading ? <><span className="spinner-border spinner-border-sm me-1"></span>{isEdit ? "Updating..." : "Submitting..."}</> : isEdit ? "Update" : "Submit"}
                        </Button>
                        <Button color="outline-danger" onClick={() => navigate("/doctor")} disabled={isLoading}>Cancel</Button>
                      </div>
                    ) : (
                      <div className="hstack gap-2 mt-4">
                        <Button color="secondary" onClick={() => navigate("/doctor")}>Back to List</Button>
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

export default DoctorForm;
