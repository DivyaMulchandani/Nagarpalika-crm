import React, { useState, useEffect, useContext, useCallback } from "react";
import {
  Card, CardBody, CardHeader, Col, Container, Row,
  Form, Input, Label, Button,
} from "reactstrap";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { createEmployee, updateEmployee, getEmployeeById, resetEmployeePassword } from "../../api/employees.api";
import { getAllDepartments } from "../../api/departments.api";
import { getAllCountries, getStatesByCountry, getCitiesByState } from "../../api/locations.api";
import { getAllRoles } from "../../api/roles.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import Select from "react-select";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";
import { ROLES } from "../../constants/roles";

const initialState = {
  employeeName: "",
  departmentId: "",
  emailOffice: "",
  mobileNumber: "",
  countryId: "",
  stateId: "",
  cityId: "",
  address: "",
  password: "",
  isActive: true,
};

const selectStyles = {
  control: (base) => ({ ...base, minHeight: "58px", height: "58px", backgroundColor: "transparent" }),
  placeholder: (base) => ({ ...base, marginTop: "8px" }),
  valueContainer: (base) => ({ ...base, marginTop: "8px" }),
};

const floatLabel = { opacity: 0.7, transform: "scale(0.85) translateY(-0.5rem) translateX(0.15rem)" };

const EmployeeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { adminData, role } = useContext(AuthContext);
  const { currentPagePermissions } = useContext(MenuContext);

  const isEdit = !!id && location.pathname.endsWith("/edit");
  const isView = !!id && !location.pathname.endsWith("/edit");

  const [values, setValues] = useState(initialState);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [departmentList, setDepartmentList] = useState([]);
  const [roleList, setRoleList] = useState([]);
  const [countryList, setCountryList] = useState([]);
  const [stateList, setStateList] = useState([]);
  const [cityList, setCityList] = useState([]);
  const [isStatesLoading, setIsStatesLoading] = useState(false);
  const [isCitiesLoading, setIsCitiesLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmit, setIsSubmit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // Password reset states
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetPasswordData, setResetPasswordData] = useState({ newPassword: "", confirmPassword: "" });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordResetError, setPasswordResetError] = useState("");

  const fetchStatesByCountry = useCallback(async (countryId) => {
    setIsStatesLoading(true);
    setStateList([]);
    setCityList([]);
    try {
      const response = await getStatesByCountry(countryId);
      if (response.data.isOk) setStateList(response.data.data);
    } catch {
      toast.error("Failed to load states");
    }
    setIsStatesLoading(false);
  }, []);

  const fetchCitiesByState = useCallback(async (stateId) => {
    setIsCitiesLoading(true);
    setCityList([]);
    try {
      const response = await getCitiesByState(stateId);
      if (response.data.isOk) setCityList(response.data.data);
    } catch {
      toast.error("Failed to load cities");
    }
    setIsCitiesLoading(false);
  }, []);

  useEffect(() => {
    getAllDepartments().then((res) => { if (res.data.isOk) setDepartmentList(res.data.data); });
    getAllCountries().then((res) => { if (res.data.isOk) setCountryList(res.data.data); });
    getAllRoles().then((res) => setRoleList(res.data.data));
  }, []);

  useEffect(() => {
    if (id) {
      setIsFetching(true);
      getEmployeeById(id)
        .then(async (res) => {
          if (res.data.isOk) {
            const d = res.data.data;
            setValues({
              employeeName: d.employeeName,
              countryId: d.countryId?._id || d.countryId || "",
              stateId: d.stateId?._id || d.stateId || "",
              cityId: d.cityId?._id || d.cityId || "",
              departmentId: d.departmentId?._id || "",
              emailOffice: d.emailOffice,
              mobileNumber: d.mobileNumber,
              address: d.address,
              isActive: d.isActive,
              password: "",
            });
            if (d.departmentId) setSelectedDepartment({ value: d.departmentId._id, label: d.departmentId.departmentName });
            if (d.roleId) setSelectedRole({ value: d.roleId._id, label: d.roleId.roleName });
            if (d.countryId) {
              await fetchStatesByCountry(d.countryId._id || d.countryId);
              if (d.stateId) await fetchCitiesByState(d.stateId._id || d.stateId);
            }
          }
        })
        .catch(() => toast.error("Failed to fetch employee details"))
        .finally(() => setIsFetching(false));
    }
  }, [id]);

  const validate = (v) => {
    const errors = {};
    if (!v.employeeName) errors.employeeName = "Name is required";
    if (!v.address) errors.address = "Address is required";
    if (!v.emailOffice) errors.emailOffice = "Email is required";
    else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(v.emailOffice)) errors.emailOffice = "Invalid email address";
    if (!isEdit && !v.password) errors.password = "Password is required";
    if (!selectedDepartment) errors.department = "Department is required";
    if (!v.countryId) errors.country = "Country is required";
    if (!v.stateId) errors.state = "State is required";
    if (!v.cityId) errors.city = "City is required";
    if (!selectedRole) errors.role = "Role is required";
    return errors;
  };

  const handleChange = async (e) => {
    const { name, value } = e.target;
    if (name === "countryId") {
      setValues((prev) => ({ ...prev, countryId: value, stateId: "", cityId: "" }));
      if (value) await fetchStatesByCountry(value);
    } else if (name === "stateId") {
      setValues((prev) => ({ ...prev, stateId: value, cityId: "" }));
      if (value) await fetchCitiesByState(value);
    } else {
      setValues((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleCheck = (e) => setValues((prev) => ({ ...prev, [e.target.name]: e.target.checked }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validate(values);
    setFormErrors(errors);
    setIsSubmit(true);
    if (Object.keys(errors).length > 0) return;

    setIsLoading(true);
    const employeeData = {
      employeeName: values.employeeName,
      departmentId: selectedDepartment?.value || "",
      countryId: values.countryId,
      stateId: values.stateId,
      cityId: values.cityId,
      roleId: selectedRole?.value || "",
      emailOffice: values.emailOffice,
      mobileNumber: values.mobileNumber,
      address: values.address,
      isActive: values.isActive,
      ...(isEdit ? {} : { password: values.password }),
    };

    const action = isEdit ? updateEmployee(id, employeeData) : createEmployee(employeeData);
    action
      .then((res) => {
        if (res.data.isOk || !isEdit) {
          toast.success(isEdit ? "Employee Updated Successfully" : "Employee Added Successfully");
          navigate("/employee");
        }
      })
      .catch(() => toast.error(`Failed to ${isEdit ? "update" : "add"} employee. Please try again.`))
      .finally(() => setIsLoading(false));
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
      setPasswordResetError("Passwords do not match");
      return;
    }
    if (resetPasswordData.newPassword.length < 6) {
      setPasswordResetError("Password must be at least 6 characters");
      return;
    }
    setIsLoading(true);
    try {
      const response = await resetEmployeePassword(id, { password: resetPasswordData.newPassword });
      if (response.isOk) {
        toast.success("Password reset successfully");
        setShowResetPassword(false);
        setResetPasswordData({ newPassword: "", confirmPassword: "" });
        setPasswordResetError("");
      } else {
        toast.error("Failed to reset password");
      }
    } catch {
      toast.error("Failed to reset password");
    }
    setIsLoading(false);
  };

  const title = isEdit ? "Edit Employee" : isView ? "View Employee" : "Add Employee";
  document.title = `${title} | ${adminData?.companyName}`;

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb maintitle="Setup" title={title} pageTitle="Employee" pageTitlePath="/employee" />
        <Row>
          <Col lg={12}>
            <Card>
              <CardHeader className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">{title}</h5>
                {isView && currentPagePermissions.edit && (
                  <Button color="success" size="sm" onClick={() => navigate(`/employee/${id}/edit`)}>
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
                      <Col lg={3}>
                        <div className="form-floating mb-3">
                          <Input type="text" name="employeeName" value={values.employeeName} onChange={handleChange} disabled={isView} placeholder="Name" />
                          <Label>Name <span className="text-danger">*</span></Label>
                          {isSubmit && <p className="text-danger">{formErrors.employeeName}</p>}
                        </div>
                      </Col>
                      <Col lg={3}>
                        <div className="form-floating mb-3">
                          <Select
                            styles={selectStyles}
                            options={departmentList.map((d) => ({ value: d._id, label: d.departmentName }))}
                            value={selectedDepartment}
                            onChange={(opt) => setSelectedDepartment(opt)}
                            isDisabled={isView}
                            placeholder=""
                          />
                          <label style={floatLabel}>Department <span className="text-danger">*</span></label>
                          {isSubmit && <p className="text-danger">{formErrors.department}</p>}
                        </div>
                      </Col>
                      <Col lg={3}>
                        <div className="form-floating mb-3">
                          <Input type="text" name="emailOffice" value={values.emailOffice} onChange={handleChange} disabled={isView} placeholder="Email Office" />
                          <Label>Email Office <span className="text-danger">*</span></Label>
                          {isSubmit && <p className="text-danger">{formErrors.emailOffice}</p>}
                        </div>
                      </Col>
                      <Col lg={3}>
                        <div className="form-floating mb-3">
                          <Input
                            type="tel"
                            name="mobileNumber"
                            value={values.mobileNumber}
                            onChange={(e) => { const v = e.target.value; if (v === "" || /^[0-9]+$/.test(v)) setValues((prev) => ({ ...prev, mobileNumber: v })); }}
                            disabled={isView}
                            maxLength={10}
                            placeholder="Mobile Number"
                          />
                          <Label>Mobile Number</Label>
                        </div>
                      </Col>
                    </Row>

                    <Row>
                      <Col lg={3}>
                        <div className="form-floating mb-3">
                          <select
                            className="form-select"
                            name="countryId"
                            value={values.countryId}
                            onChange={handleChange}
                            disabled={isView}
                          >
                            <option value="">Select Country</option>
                            {countryList.map((c) => <option key={c._id} value={c._id}>{c.countryName}</option>)}
                          </select>
                          <Label>Country <span className="text-danger">*</span></Label>
                          {isSubmit && <p className="text-danger">{formErrors.country}</p>}
                        </div>
                      </Col>
                      <Col lg={3}>
                        <div className="form-floating mb-3">
                          <select
                            className="form-select"
                            name="stateId"
                            value={values.stateId}
                            onChange={handleChange}
                            disabled={isView || !values.countryId || isStatesLoading}
                          >
                            <option value="">Select State</option>
                            {stateList.map((s) => <option key={s._id} value={s._id}>{s.stateName}</option>)}
                          </select>
                          <Label>State <span className="text-danger">*</span></Label>
                          {isSubmit && <p className="text-danger">{formErrors.state}</p>}
                        </div>
                      </Col>
                      <Col lg={3}>
                        <div className="form-floating mb-3">
                          <select
                            className="form-select"
                            name="cityId"
                            value={values.cityId}
                            onChange={handleChange}
                            disabled={isView || !values.stateId || isCitiesLoading}
                          >
                            <option value="">Select City</option>
                            {cityList.map((c) => <option key={c._id} value={c._id}>{c.cityName}</option>)}
                          </select>
                          <Label>City <span className="text-danger">*</span></Label>
                          {isSubmit && <p className="text-danger">{formErrors.city}</p>}
                        </div>
                      </Col>
                      <Col lg={3}>
                        <div className="form-floating mb-3">
                          <Select
                            styles={selectStyles}
                            options={roleList.map((r) => ({ value: r._id, label: r.roleName }))}
                            value={selectedRole}
                            onChange={(opt) => setSelectedRole(opt)}
                            isDisabled={isView}
                            placeholder=""
                          />
                          <label style={floatLabel}>Role <span className="text-danger">*</span></label>
                          {isSubmit && <p className="text-danger">{formErrors.role}</p>}
                        </div>
                      </Col>
                    </Row>

                    {!isEdit && !isView && (
                      <Row>
                        <Col lg={3}>
                          <div className="form-floating mb-3">
                            <Input type="text" name="password" value={values.password} onChange={handleChange} placeholder="Password" />
                            <Label>Password <span className="text-danger">*</span></Label>
                            {isSubmit && <p className="text-danger">{formErrors.password}</p>}
                          </div>
                        </Col>
                      </Row>
                    )}

                    <Row>
                      <Col lg={12}>
                        <div className="form-floating mb-3">
                          <textarea
                            className="form-control"
                            style={{ height: "100px" }}
                            name="address"
                            value={values.address}
                            onChange={handleChange}
                            disabled={isView}
                            placeholder="Address"
                          />
                          <Label>Address <span className="text-danger">*</span></Label>
                          {isSubmit && <p className="text-danger">{formErrors.address}</p>}
                        </div>
                      </Col>
                    </Row>

                    {isEdit && role === ROLES.ADMIN && (
                      <Row className="mt-4 mb-4">
                        <Col lg={12}>
                          <div className="d-flex align-items-center mb-2">
                            <h5 className="mb-0">Reset Password</h5>
                            <button type="button" className="btn btn-sm btn-primary ms-2" onClick={() => { setShowResetPassword(!showResetPassword); setPasswordResetError(""); setResetPasswordData({ newPassword: "", confirmPassword: "" }); }}>
                              {showResetPassword ? "Cancel" : "Change Password"}
                            </button>
                          </div>
                          {showResetPassword && (
                            <div className="border rounded p-3">
                              <Row>
                                <Col lg={5}>
                                  <Label>New Password <span className="text-danger">*</span></Label>
                                  <div className="position-relative mb-3">
                                    <Input type={showNewPassword ? "text" : "password"} name="newPassword" value={resetPasswordData.newPassword} onChange={(e) => setResetPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))} />
                                    <button type="button" className="btn btn-link position-absolute end-0 top-0 text-decoration-none text-muted" onClick={() => setShowNewPassword(!showNewPassword)} tabIndex={-1}>
                                      <i className={`ri-eye${showNewPassword ? "" : "-off"}-line`}></i>
                                    </button>
                                  </div>
                                </Col>
                                <Col lg={5}>
                                  <Label>Confirm Password <span className="text-danger">*</span></Label>
                                  <div className="position-relative mb-3">
                                    <Input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" value={resetPasswordData.confirmPassword} onChange={(e) => setResetPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))} />
                                    <button type="button" className="btn btn-link position-absolute end-0 top-0 text-decoration-none text-muted" onClick={() => setShowConfirmPassword(!showConfirmPassword)} tabIndex={-1}>
                                      <i className={`ri-eye${showConfirmPassword ? "" : "-off"}-line`}></i>
                                    </button>
                                  </div>
                                </Col>
                                <Col lg={2}>
                                  <div className="d-flex align-items-end h-100 mb-3">
                                    <button type="button" className="btn btn-success" onClick={handleResetPassword}>Reset Password</button>
                                  </div>
                                </Col>
                              </Row>
                              {passwordResetError && <div className="text-danger">{passwordResetError}</div>}
                            </div>
                          )}
                        </Col>
                      </Row>
                    )}

                    <div className="mb-3">
                      <Input type="checkbox" className="form-check-input" name="isActive" checked={values.isActive} onChange={handleCheck} disabled={isView} />
                      <Label className="form-check-label ms-1">Is Active</Label>
                    </div>

                    {!isView ? (
                      <div className="hstack gap-2 mt-4">
                        <Button color="success" onClick={handleSubmit} disabled={isLoading}>
                          {isLoading ? <><span className="spinner-border spinner-border-sm me-1"></span>{isEdit ? "Updating..." : "Submitting..."}</> : isEdit ? "Update" : "Submit"}
                        </Button>
                        <Button color="outline-danger" onClick={() => navigate("/employee")} disabled={isLoading}>Cancel</Button>
                      </div>
                    ) : (
                      <div className="hstack gap-2 mt-4">
                        <Button color="secondary" onClick={() => navigate("/employee")}>Back to List</Button>
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

export default EmployeeForm;
