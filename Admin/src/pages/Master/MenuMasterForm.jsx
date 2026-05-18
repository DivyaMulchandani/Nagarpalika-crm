import React, { useState, useEffect, useContext } from "react";
import {
  Card, CardBody, CardHeader, Col, Container, Row,
  Form, Input, Label, Button,
} from "reactstrap";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { createMenu, updateMenu, getMenuById, getAllMenuGroups, getAllMenus } from "../../api/menus.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import IconPicker from "../../Components/Common/IconPicker";
import Select from "react-select";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";

const initialState = { menuName: "", menuGroup: "", menuUrl: "", sequence: "", isActive: true, isParent: false, parentMenu: null, icon: "" };

const selectStyles = {
  control: (base) => ({ ...base, minHeight: "58px", height: "58px", backgroundColor: "transparent" }),
  placeholder: (base) => ({ ...base, marginTop: "8px" }),
  valueContainer: (base) => ({ ...base, marginTop: "8px" }),
};

const floatLabel = { opacity: 0.7, transform: "scale(0.85) translateY(-0.5rem) translateX(0.15rem)" };

const MenuMasterForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions } = useContext(MenuContext);

  const isEdit = !!id && location.pathname.endsWith("/edit");
  const isView = !!id && !location.pathname.endsWith("/edit");

  const [values, setValues] = useState(initialState);
  const [selectedMenuGroup, setSelectedMenuGroup] = useState(null);
  const [selectedParentMenu, setSelectedParentMenu] = useState(null);
  const [menuGroupList, setMenuGroupList] = useState([]);
  const [parentMenuList, setParentMenuList] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmit, setIsSubmit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    getAllMenuGroups().then((res) => setMenuGroupList(res.data.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedMenuGroup) {
      fetchParentMenus(selectedMenuGroup.value);
    }
  }, [selectedMenuGroup]);

  const fetchParentMenus = async (groupId) => {
    if (!groupId) return;
    try {
      const response = await getAllMenus();
      const menuData = response.data.data;
      const menuMap = new Map();

      menuData.forEach((menu) => {
        if (menu.menuGroup._id === groupId || menu.menuGroup === groupId) {
          menuMap.set(menu._id.toString(), { ...menu, path: menu.menuName });
        }
      });

      menuData.forEach((menu) => {
        if (menu.menuGroup._id === groupId || menu.menuGroup === groupId) {
          if (menu.parentMenu && menuMap.has(menu.parentMenu.toString())) {
            const parent = menuMap.get(menu.parentMenu.toString());
            const current = menuMap.get(menu._id.toString());
            current.path = `${parent.path} > ${current.path}`;
            menuMap.set(menu._id.toString(), current);
          }
        }
      });

      const validParents = Array.from(menuMap.values())
        .filter((menu) => menu.isParent === true && (!id || menu._id.toString() !== id.toString()))
        .map((menu) => ({ _id: menu._id, menuName: menu.path }));

      setParentMenuList(validParents);
    } catch (error) {
      console.error("Error fetching parent menus:", error);
    }
  };

  useEffect(() => {
    if (id) {
      setIsFetching(true);
      getMenuById(id)
        .then(async (res) => {
          const d = res.data.data;
          setValues({
            menuName: d.menuName,
            menuGroup: d.menuGroup,
            menuUrl: d.menuUrl || "",
            sequence: d.sequence,
            isActive: d.isActive,
            isParent: d.isParent || false,
            parentMenu: d.parentMenu || null,
            icon: d.icon || "",
          });
          const groupId = d.menuGroup._id || d.menuGroup;
          setSelectedMenuGroup({ value: groupId, label: d.menuGroup.menuGroupName || "" });
          await fetchParentMenus(groupId);
          if (d.parentMenu) {
            setSelectedParentMenu({ value: d.parentMenu._id || d.parentMenu, label: d.parentMenu.menuName || "" });
          }
        })
        .catch(() => toast.error("Failed to fetch menu details"))
        .finally(() => setIsFetching(false));
    }
  }, [id]);

  const validate = (v) => {
    const errors = {};
    if (!v.menuName) errors.menuName = "Menu Name is required!";
    if (!selectedMenuGroup) errors.menuGroup = "Menu Group is required!";
    if (!v.isParent && !v.menuUrl) errors.menuUrl = "Menu URL is required for non-parent menus!";
    if (!v.sequence) errors.sequence = "Sequence is required!";
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
    const dataToSend = { ...values, menuGroup: selectedMenuGroup.value, parentMenu: selectedParentMenu ? selectedParentMenu.value : null };
    const action = isEdit ? updateMenu(id, dataToSend) : createMenu(dataToSend);
    action
      .then((res) => {
        if (res.data.isOk) {
          toast.success(isEdit ? "Menu Updated Successfully!" : "Menu Added Successfully!");
          navigate("/menu-master");
        }
      })
      .catch(() => toast.error(`Failed to ${isEdit ? "update" : "add"} menu. Please try again.`))
      .finally(() => setIsLoading(false));
  };

  const title = isEdit ? "Edit Menu" : isView ? "View Menu" : "Add Menu";
  document.title = `${title} | ${adminData?.companyName}`;

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb maintitle="Master" title={title} pageTitle="Menu Master" />
        <Row>
          <Col lg={8}>
            <Card>
              <CardHeader className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">{title}</h5>
                {isView && currentPagePermissions.edit && (
                  <Button color="success" size="sm" onClick={() => navigate(`/menu-master/${id}/edit`)}>
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
                      <Select
                        styles={selectStyles}
                        options={menuGroupList.map((g) => ({ value: g._id, label: g.menuGroupName }))}
                        value={selectedMenuGroup}
                        onChange={(opt) => { setSelectedMenuGroup(opt); setSelectedParentMenu(null); }}
                        isDisabled={isView}
                        placeholder=""
                      />
                      <label style={floatLabel}>Menu Group <span className="text-danger">*</span></label>
                      {isSubmit && <p className="text-danger">{formErrors.menuGroup}</p>}
                    </div>

                    <div className="form-floating mb-3">
                      <Input type="text" name="menuName" value={values.menuName} onChange={handleChange} disabled={isView} placeholder="Menu Name" />
                      <Label>Menu Name <span className="text-danger">*</span></Label>
                      {isSubmit && <p className="text-danger">{formErrors.menuName}</p>}
                    </div>

                    <div className="form-floating mb-3">
                      <Input type="text" name="menuUrl" value={values.menuUrl} onChange={handleChange} disabled={isView} placeholder="Menu URL" />
                      <Label>Menu URL {!values.isParent && <span className="text-danger">*</span>}</Label>
                      {isSubmit && <p className="text-danger">{formErrors.menuUrl}</p>}
                    </div>

                    {!isView && (
                      <IconPicker value={values.icon} onChange={(icon) => setValues({ ...values, icon })} label="Menu Icon" />
                    )}
                    {isView && values.icon && (
                      <div className="mb-3">
                        <Label>Icon</Label>
                        <div><i className={`${values.icon} fs-4`}></i> <span className="ms-2 text-muted">{values.icon}</span></div>
                      </div>
                    )}

                    <div className="form-floating mb-3">
                      <Input type="number" name="sequence" value={values.sequence} onChange={handleChange} disabled={isView} placeholder="Sequence" />
                      <Label>Sequence <span className="text-danger">*</span></Label>
                      {isSubmit && <p className="text-danger">{formErrors.sequence}</p>}
                    </div>

                    <div className="mb-3">
                      <Input type="checkbox" className="form-check-input" name="isActive" checked={values.isActive} onChange={handleCheck} disabled={isView} />
                      <Label className="form-check-label ms-1">Is Active</Label>
                    </div>

                    <div className="mb-3">
                      <Input type="checkbox" className="form-check-input" name="isParent" id="isParentCheck" checked={values.isParent} onChange={handleCheck} disabled={isView} />
                      <Label className="form-check-label ms-1" htmlFor="isParentCheck">Is Parent Menu (can contain child menus)</Label>
                    </div>

                    <div className="form-floating mb-3">
                      <Select
                        styles={selectStyles}
                        options={parentMenuList.map((m) => ({ value: m._id, label: m.menuName }))}
                        value={selectedParentMenu}
                        onChange={(opt) => setSelectedParentMenu(opt)}
                        isDisabled={isView}
                        isClearable
                        placeholder="Select a parent menu"
                      />
                      <label style={floatLabel}>Parent Menu (optional)</label>
                      <small className="text-muted">Select a parent menu to nest this menu under.</small>
                    </div>

                    {!isView ? (
                      <div className="hstack gap-2 mt-4">
                        <Button color="success" onClick={handleSubmit} disabled={isLoading}>
                          {isLoading ? <><span className="spinner-border spinner-border-sm me-1"></span>{isEdit ? "Updating..." : "Submitting..."}</> : isEdit ? "Update" : "Submit"}
                        </Button>
                        <Button color="outline-danger" onClick={() => navigate("/menu-master")} disabled={isLoading}>Cancel</Button>
                      </div>
                    ) : (
                      <div className="hstack gap-2 mt-4">
                        <Button color="secondary" onClick={() => navigate("/menu-master")}>Back to List</Button>
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

export default MenuMasterForm;
