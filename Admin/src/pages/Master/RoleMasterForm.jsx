import React, { useState, useEffect, useContext } from "react";
import {
  Card, CardBody, CardHeader, Col, Container, Row,
  Form, Input, Label, Button,
} from "reactstrap";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { createRole, updateRole, getRoleById } from "../../api/roles.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";

const initialState = { roleName: "", isActive: true };

const RoleMasterForm = () => {
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
      getRoleById(id)
        .then((res) => {
          const d = res.data.data;
          setValues({ roleName: d.roleName, isActive: d.isActive });
        })
        .catch(() => toast.error("Failed to fetch role details"))
        .finally(() => setIsFetching(false));
    }
  }, [id]);

  const validate = (v) => {
    const errors = {};
    if (!v.roleName) errors.roleName = "Role Name is required!";
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
    const action = isEdit ? updateRole(id, values) : createRole(values);
    action
      .then((res) => {
        if (res.data.isOk) {
          toast.success(isEdit ? "Role Updated Successfully!" : "Role Added Successfully!");
          navigate("/role-master");
        }
      })
      .catch(() => toast.error(`Failed to ${isEdit ? "update" : "add"} role. Please try again.`))
      .finally(() => setIsLoading(false));
  };

  const title = isEdit ? "Edit Role" : isView ? "View Role" : "Add Role";
  document.title = `${title} | ${adminData?.companyName}`;

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb maintitle="Employee Management" title={title} pageTitle="Role Master" />
        <Row>
          <Col lg={6}>
            <Card>
              <CardHeader className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">{title}</h5>
                {isView && currentPagePermissions.edit && (
                  <Button color="success" size="sm" onClick={() => navigate(`/role-master/${id}/edit`)}>
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
                      <Input type="text" name="roleName" value={values.roleName} onChange={handleChange} disabled={isView} placeholder="Role Name" />
                      <Label>Role Name <span className="text-danger">*</span></Label>
                      {isSubmit && <p className="text-danger">{formErrors.roleName}</p>}
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
                        <Button color="outline-danger" onClick={() => navigate("/role-master")} disabled={isLoading}>Cancel</Button>
                      </div>
                    ) : (
                      <div className="hstack gap-2 mt-4">
                        <Button color="secondary" onClick={() => navigate("/role-master")}>Back to List</Button>
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

export default RoleMasterForm;
