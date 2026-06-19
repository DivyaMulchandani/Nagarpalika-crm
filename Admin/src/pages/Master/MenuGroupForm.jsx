import React, { useState, useEffect, useContext } from "react";
import {
  Card, CardBody, CardHeader, Col, Container, Row,
  Form, Input, Label, Button,
} from "reactstrap";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { createMenuGroup, updateMenuGroup, getMenuGroupById } from "../../api/menus.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import IconPicker from "../../Components/Common/IconPicker";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";

const initialState = { menuGroupName: "", sequence: "", isActive: true, isLink: false, menuUrl: "", icon: "" };

const MenuGroupForm = () => {
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
      getMenuGroupById(id)
        .then((res) => {
          const d = res.data.data;
          setValues({
            menuGroupName: d.menuGroupName,
            sequence: d.sequence,
            isActive: d.isActive,
            isLink: d.isLink || false,
            menuUrl: d.menuUrl || "",
            icon: d.icon || "",
          });
        })
        .catch(() => toast.error("Failed to fetch menu group details"))
        .finally(() => setIsFetching(false));
    }
  }, [id]);

  const validate = (v) => {
    const errors = {};
    if (!v.menuGroupName) errors.menuGroupName = "Menu Group Name is required!";
    if (!v.sequence) errors.sequence = "Sequence is required!";
    if (v.isLink && !v.menuUrl) errors.menuUrl = "Menu URL is required for direct link menu groups!";
    return errors;
  };

  const handleChange = (e) => setValues({ ...values, [e.target.name]: e.target.value });
  const handleCheck = (e) => setValues({ ...values, [e.target.name]: e.target.checked });

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validate(values);
    setFormErrors(errors);
    setIsSubmit(true);
    if (Object.keys(errors).length > 0) return;

    setIsLoading(true);
    const action = isEdit ? updateMenuGroup(id, values) : createMenuGroup(values);
    action
      .then((res) => {
        if (res.data.isOk) {
          toast.success(isEdit ? "Menu Group Updated Successfully!" : "Menu Group Added Successfully!");
          navigate("/menu-group");
        }
      })
      .catch(() => toast.error(`Failed to ${isEdit ? "update" : "add"} menu group. Please try again.`))
      .finally(() => setIsLoading(false));
  };

  const title = isEdit ? "Edit Menu Group" : isView ? "View Menu Group" : "Add Menu Group";
  document.title = `${title} | ${adminData?.companyName}`;

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb maintitle="Master" title={title} pageTitle="Menu Group" pageTitlePath="/menu-group" />
        <Row>
          <Col lg={6}>
            <Card>
              <CardHeader className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">{title}</h5>
                {isView && currentPagePermissions.edit && (
                  <Button color="success" size="sm" onClick={() => navigate(`/menu-group/${id}/edit`)}>
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
                      <Input type="text" name="menuGroupName" value={values.menuGroupName} onChange={handleChange} disabled={isView} placeholder="Menu Group Name" />
                      <Label>Menu Group Name <span className="text-danger">*</span></Label>
                      {isSubmit && <p className="text-danger">{formErrors.menuGroupName}</p>}
                    </div>

                    <div className="form-floating mb-3">
                      <Input type="number" name="sequence" value={values.sequence} onChange={handleChange} disabled={isView} min={1} placeholder="Sequence" />
                      <Label>Sequence <span className="text-danger">*</span></Label>
                      {isSubmit && <p className="text-danger">{formErrors.sequence}</p>}
                    </div>

                    {!isView && (
                      <IconPicker
                        value={values.icon}
                        onChange={(icon) => setValues({ ...values, icon })}
                        label="Menu Group Icon"
                      />
                    )}
                    {isView && values.icon && (
                      <div className="mb-3">
                        <Label>Icon</Label>
                        <div><i className={`${values.icon} fs-4`}></i> <span className="ms-2 text-muted">{values.icon}</span></div>
                      </div>
                    )}

                    <div className="mb-3">
                      <Input type="checkbox" className="form-check-input" name="isLink" id="isLinkCheck" checked={values.isLink} onChange={handleCheck} disabled={isView} />
                      <Label className="form-check-label ms-1" htmlFor="isLinkCheck">Is Direct Link (no submenus)</Label>
                    </div>

                    {values.isLink && (
                      <div className="form-floating mb-3">
                        <Input type="text" name="menuUrl" value={values.menuUrl} onChange={handleChange} disabled={isView} placeholder="Menu URL" />
                        <Label>Menu URL <span className="text-danger">*</span></Label>
                        {isSubmit && <p className="text-danger">{formErrors.menuUrl}</p>}
                      </div>
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
                        <Button color="outline-danger" onClick={() => navigate("/menu-group")} disabled={isLoading}>Cancel</Button>
                      </div>
                    ) : (
                      <div className="hstack gap-2 mt-4">
                        <Button color="secondary" onClick={() => navigate("/menu-group")}>Back to List</Button>
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

export default MenuGroupForm;
