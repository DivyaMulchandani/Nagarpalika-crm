import React, { useState, useEffect, useContext } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  CardHeader,
  CardBody,
  Input,
  Label,
  Table,
  Button,
  FormGroup,
  Spinner,
  Badge,
  UncontrolledTooltip,
  Alert
} from "reactstrap";
import Select from "react-select";
import { toast } from "react-toastify";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { MenuContext } from "../../context/MenuContext";
import { AuthContext } from "../../context/AuthContext";
import { getAllRoles } from "../../api/roles.api";
import { getMenusByGroups } from "../../api/menus.api";
import { getEmployeeRolesByRoleId, createEmployeeRoles, updateEmployeeRoles } from "../../api/employeeRoles.api";

const EmployeeRoles = () => {
  // States
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [menuData, setMenuData] = useState([]);
  const [employeeRoles, setEmployeeRoles] = useState(null);
  const [rolesChanged, setRolesChanged] = useState(false);
  const [hoveredRow, setHoveredRow] = useState(null);

  const {menuData: contextMenuData, loading: menuLoading} = useContext(MenuContext);
  const {adminData} = useContext(AuthContext);

  // Fetch all roles and menu data
  useEffect(() => {
    fetchRoles();
    fetchAllMenuData();
  }, []);
  
  // Fetch employee roles when an employee is selected
  useEffect(() => {
    if (selectedRole) {
      fetchEmployeeRoles(selectedRole.value);
    } else {
      setEmployeeRoles(null);
    }
  }, [selectedRole]);

  // API Calls
  const fetchRoles = async () => {
    setLoading(true);
    try {
      const response = await getAllRoles();
      
      if (response.data.isOk) {
        // Format for react-select
        const formattedRoles = response.data.data.map(role => ({
          value: role._id,
          label: role.roleName,
        }));
        setRoles(formattedRoles);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
      toast.error("Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  // Fetch all menu data using the same API as MenuContext
  const fetchAllMenuData = async () => {
    setLoading(true);
    try {
      console.log("Fetching menus from MenuContext API...");
      const response = await getMenusByGroups();

      if (response.data.isOk) {
        const menuGroupsData = response.data.data;
        console.log("Menu groups data:", menuGroupsData);
        
        if (Array.isArray(menuGroupsData)) {
          setMenuData(menuGroupsData);
        } else {
          console.error("Menu data is not an array");
          toast.error("Menu data is in an unexpected format");
        }
      } else {
        console.error("No data in API response or isOk is false");
        toast.error("Failed to load menu data");
        
        // If context data is available, use it as a fallback
        if (contextMenuData && contextMenuData.length > 0) {
          console.log("Using MenuContext data as fallback");
          setMenuData(contextMenuData);
        }
      }
    } catch (error) {
      console.error("Error fetching menu data:", error);
      toast.error("Failed to load menus and menu groups");
      
      // If context data is available, use it as a fallback
      if (contextMenuData && contextMenuData.length > 0) {
        console.log("Using MenuContext data as fallback");
        setMenuData(contextMenuData);
      }
    } finally {
      setLoading(false);
    }
  };
  
  const fetchEmployeeRoles = async (roleId) => {
    setLoading(true);
    try {
      const response = await getEmployeeRolesByRoleId(roleId);

      if (response.data.data && response.data.data.length > 0) {
        console.log("Employee roles:", response.data.data[0]);
        setEmployeeRoles(response.data.data[0]);
      } else {
        // If no roles found, set to null
        setEmployeeRoles(null);
        toast.info(response.message)
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        // No roles assigned yet, that's fine
        setEmployeeRoles(null);
      } else {
        toast.error("Failed to load employee roles");
      }
    } finally {
      setLoading(false);
      setRolesChanged(false);
    }
  };
  
  // Handle permission checkboxes
  const handlePermissionChange = (id, isGroup, permission, isChecked) => {
    setRolesChanged(true);
    
    const menuField = isGroup ? "menuGroupId" : "menuId";
    
    if (!employeeRoles) {
      // Create new roles structure if none exists
      const newRoles = {
        roleId: selectedRole.value,
        roles: [
          {
            [menuField]: id,
            read: permission === "read" ? isChecked : false,
            write: permission === "write" ? isChecked : false,
            delete: permission === "delete" ? isChecked : false,
            edit: permission === "edit" ? isChecked : false,
            print: permission === "print" ? isChecked : false,
            mail: permission === "mail" ? isChecked : false,
          }
        ]
      };
      setEmployeeRoles(newRoles);
    } else {
      // Update existing roles
      const updatedRoles = { ...employeeRoles };
      
      // Find existing role by menuId or menuGroupId
      const roleIndex = updatedRoles.roles.findIndex(r => 
        (isGroup ? r.menuGroupId === id : r.menuId === id)
      );
      
      if (roleIndex === -1) {
        // Add new menu permission
        updatedRoles.roles.push({
          [menuField]: id,
          read: permission === "read" ? isChecked : false,
          write: permission === "write" ? isChecked : false,
          delete: permission === "delete" ? isChecked : false,
          edit: permission === "edit" ? isChecked : false,
          print: permission === "print" ? isChecked : false,
          mail: permission === "mail" ? isChecked : false,
        });
      } else {
        // Update existing menu permission
        updatedRoles.roles[roleIndex][permission] = isChecked;
      }
      
      setEmployeeRoles(updatedRoles);
    }
  };
  
  // Handle all permissions for a menu
  const handleAllPermissions = (id, isGroup, isChecked) => {
    setRolesChanged(true);
    
    const menuField = isGroup ? "menuGroupId" : "menuId";
    
    if (!employeeRoles) {
      // Create new roles structure with all permissions
      const newRoles = {
        roleId: selectedRole.value,
        roles: [
          {
            [menuField]: id,
            read: isChecked,
            write: isChecked,
            delete: isChecked,
            edit: isChecked,
            print: isChecked,
            mail: isChecked,
          }
        ]
      };
      setEmployeeRoles(newRoles);
    } else {
      // Update existing roles
      const updatedRoles = { ...employeeRoles };
      
      // Find existing role by menuId or menuGroupId
      const roleIndex = updatedRoles.roles.findIndex(r => 
        (isGroup ? r.menuGroupId === id : r.menuId === id)
      );
      
      if (roleIndex === -1) {
        // Add new menu permission with all permissions set
        updatedRoles.roles.push({
          [menuField]: id,
          read: isChecked,
          write: isChecked,
          delete: isChecked,
          edit: isChecked,
          print: isChecked,
          mail: isChecked,
        });
      } else {
        // Update all permissions
        updatedRoles.roles[roleIndex].read = isChecked;
        updatedRoles.roles[roleIndex].write = isChecked;
        updatedRoles.roles[roleIndex].delete = isChecked;
        updatedRoles.roles[roleIndex].edit = isChecked;
        updatedRoles.roles[roleIndex].print = isChecked;
        updatedRoles.roles[roleIndex].mail = isChecked;
      }
      
      setEmployeeRoles(updatedRoles);
    }
  };

  // Handle column-wide permission changes
  const handleColumnPermissionChange = (permission, isChecked) => {
    setRolesChanged(true);
    
    if (!employeeRoles) {
      // Create new roles structure with all menus having the specified permission
      const allMenuIds = [];
      const allGroupIds = [];
      
      // Collect all menu IDs and group IDs
      menuData.forEach(group => {
        if (group.isLink) {
          allGroupIds.push(group.groupId);
        } else if (group.menus) {
          const collectMenuIds = (menus) => {
            menus.forEach(menu => {
              allMenuIds.push(menu.id);
              if (menu.children && menu.children.length > 0) {
                collectMenuIds(menu.children);
              }
            });
          };
          collectMenuIds(group.menus);
        }
      });
      
      const newRoles = {
        roleId: selectedRole.value,
        roles: [
          ...allMenuIds.map(menuId => ({
            menuId,
            read: permission === "read" ? isChecked : false,
            write: permission === "write" ? isChecked : false,
            delete: permission === "delete" ? isChecked : false,
            edit: permission === "edit" ? isChecked : false,
            print: permission === "print" ? isChecked : false,
            mail: permission === "mail" ? isChecked : false,
          })),
          ...allGroupIds.map(groupId => ({
            menuGroupId: groupId,
            read: permission === "read" ? isChecked : false,
            write: permission === "write" ? isChecked : false,
            delete: permission === "delete" ? isChecked : false,
            edit: permission === "edit" ? isChecked : false,
            print: permission === "print" ? isChecked : false,
            mail: permission === "mail" ? isChecked : false,
          }))
        ]
      };
      setEmployeeRoles(newRoles);
    } else {
      // Update existing roles
      const updatedRoles = { ...employeeRoles };
      
      // Update all existing roles with the specified permission
      updatedRoles.roles.forEach(role => {
        role[permission] = isChecked;
      });
      
      // Add permissions for menus/groups that don't exist yet
      const existingMenuIds = new Set(updatedRoles.roles.map(r => r.menuId).filter(Boolean));
      const existingGroupIds = new Set(updatedRoles.roles.map(r => r.menuGroupId).filter(Boolean));
      
      menuData.forEach(group => {
        if (group.isLink && !existingGroupIds.has(group.groupId)) {
          updatedRoles.roles.push({
            menuGroupId: group.groupId,
            read: permission === "read" ? isChecked : false,
            write: permission === "write" ? isChecked : false,
            delete: permission === "delete" ? isChecked : false,
            edit: permission === "edit" ? isChecked : false,
            print: permission === "print" ? isChecked : false,
            mail: permission === "mail" ? isChecked : false,
          });
        } else if (group.menus) {
          const addMissingMenus = (menus) => {
            menus.forEach(menu => {
              if (!existingMenuIds.has(menu.id)) {
                updatedRoles.roles.push({
                  menuId: menu.id,
                  read: permission === "read" ? isChecked : false,
                  write: permission === "write" ? isChecked : false,
                  delete: permission === "delete" ? isChecked : false,
                  edit: permission === "edit" ? isChecked : false,
                  print: permission === "print" ? isChecked : false,
                  mail: permission === "mail" ? isChecked : false,
                });
              }
              if (menu.children && menu.children.length > 0) {
                addMissingMenus(menu.children);
              }
            });
          };
          addMissingMenus(group.menus);
        }
      });
      
      setEmployeeRoles(updatedRoles);
    }
  };

  // Handle all permissions for a group
  const handleAllGroupPermissions = (groupId, isChecked) => {
    setRolesChanged(true);
    
    if (!employeeRoles) {
      // Create new roles structure for this group
      const group = menuData.find(g => g.groupId === groupId);
      if (!group) return;
      
      const newRoles = {
        roleId: selectedRole.value,
        roles: []
      };
      
      if (group.isLink) {
        newRoles.roles.push({
          menuGroupId: groupId,
          read: isChecked,
          write: isChecked,
          delete: isChecked,
          edit: isChecked,
          print: isChecked,
          mail: isChecked,
        });
      } else if (group.menus) {
        const addMenuPermissions = (menus) => {
          menus.forEach(menu => {
            newRoles.roles.push({
              menuId: menu.id,
              read: isChecked,
              write: isChecked,
              delete: isChecked,
              edit: isChecked,
              print: isChecked,
              mail: isChecked,
            });
            if (menu.children && menu.children.length > 0) {
              addMenuPermissions(menu.children);
            }
          });
        };
        addMenuPermissions(group.menus);
      }
      
      setEmployeeRoles(newRoles);
    } else {
      // Update existing roles
      const updatedRoles = { ...employeeRoles };
      const group = menuData.find(g => g.groupId === groupId);
      if (!group) return;
      
      if (group.isLink) {
        // Update group permissions
        const roleIndex = updatedRoles.roles.findIndex(r => r.menuGroupId === groupId);
        if (roleIndex === -1) {
          updatedRoles.roles.push({
            menuGroupId: groupId,
            read: isChecked,
            write: isChecked,
            delete: isChecked,
            edit: isChecked,
            print: isChecked,
            mail: isChecked,
          });
        } else {
          updatedRoles.roles[roleIndex].read = isChecked;
          updatedRoles.roles[roleIndex].write = isChecked;
          updatedRoles.roles[roleIndex].delete = isChecked;
          updatedRoles.roles[roleIndex].edit = isChecked;
          updatedRoles.roles[roleIndex].print = isChecked;
          updatedRoles.roles[roleIndex].mail = isChecked;
        }
      } else if (group.menus) {
        // Update all menu permissions in this group
        const updateMenuPermissions = (menus) => {
          menus.forEach(menu => {
            const roleIndex = updatedRoles.roles.findIndex(r => r.menuId === menu.id);
            if (roleIndex === -1) {
              updatedRoles.roles.push({
                menuId: menu.id,
                read: isChecked,
                write: isChecked,
                delete: isChecked,
                edit: isChecked,
                print: isChecked,
                mail: isChecked,
              });
            } else {
              updatedRoles.roles[roleIndex].read = isChecked;
              updatedRoles.roles[roleIndex].write = isChecked;
              updatedRoles.roles[roleIndex].delete = isChecked;
              updatedRoles.roles[roleIndex].edit = isChecked;
              updatedRoles.roles[roleIndex].print = isChecked;
              updatedRoles.roles[roleIndex].mail = isChecked;
            }
            if (menu.children && menu.children.length > 0) {
              updateMenuPermissions(menu.children);
            }
          });
        };
        updateMenuPermissions(group.menus);
      }
      
      setEmployeeRoles(updatedRoles);
    }
  };

  // Check if a menu has a particular permission
  const hasPermission = (id, isGroup, permission) => {
    if (!employeeRoles || !employeeRoles.roles) return false;
    
    const role = employeeRoles.roles.find(r => 
      isGroup ? r.menuGroupId === id : r.menuId === id
    );
    
    return role ? role[permission] : false;
  };
  
  // Check if all permissions are granted
  const hasAllPermissions = (id, isGroup) => {
    if (!employeeRoles || !employeeRoles.roles) return false;
    
    const role = employeeRoles.roles.find(r => 
      isGroup ? r.menuGroupId === id : r.menuId === id
    );
    
    if (!role) return false;
    
    return (
      role.read &&
      role.write &&
      role.delete &&
      role.edit &&
      role.print &&
      role.mail
    );
  };
  
  // Check if any permissions are granted
  const hasAnyPermissions = (id, isGroup) => {
    if (!employeeRoles || !employeeRoles.roles) return false;
    
    const role = employeeRoles.roles.find(r => 
      isGroup ? r.menuGroupId === id : r.menuId === id
    );
    
    if (!role) return false;
    
    return (
      role.read ||
      role.write ||
      role.delete ||
      role.edit ||
      role.print ||
      role.mail
    );
  };

  // Check if a column has all permissions
  const hasColumnAllPermissions = (permission) => {
    if (!employeeRoles || !employeeRoles.roles) return false;
    
    // Get all menu and group IDs from menuData
    const allIds = [];
    menuData.forEach(group => {
      if (group.isLink) {
        allIds.push({ id: group.groupId, isGroup: true });
      } else if (group.menus) {
        const collectIds = (menus) => {
          menus.forEach(menu => {
            allIds.push({ id: menu.id, isGroup: false });
            if (menu.children && menu.children.length > 0) {
              collectIds(menu.children);
            }
          });
        };
        collectIds(group.menus);
      }
    });
    
    // Check if all IDs have the specified permission
    return allIds.every(({ id, isGroup }) => {
      const role = employeeRoles.roles.find(r => 
        isGroup ? r.menuGroupId === id : r.menuId === id
      );
      return role && role[permission];
    });
  };

  // Check if a group has all permissions
  const hasGroupAllPermissions = (groupId) => {
    if (!employeeRoles || !employeeRoles.roles) return false;
    
    const group = menuData.find(g => g.groupId === groupId);
    if (!group) return false;
    
    if (group.isLink) {
      const role = employeeRoles.roles.find(r => r.menuGroupId === groupId);
      return role && role.read && role.write && role.delete && role.edit && role.print && role.mail;
    } else if (group.menus) {
      const checkAllMenus = (menus) => {
        return menus.every(menu => {
          const role = employeeRoles.roles.find(r => r.menuId === menu.id);
          const hasAll = role && role.read && role.write && role.delete && role.edit && role.print && role.mail;
          if (menu.children && menu.children.length > 0) {
            return hasAll && checkAllMenus(menu.children);
          }
          return hasAll;
        });
      };
      return checkAllMenus(group.menus);
    }
    
    return false;
  };

  // Check if a group has any permissions
  const hasGroupAnyPermissions = (groupId) => {
    if (!employeeRoles || !employeeRoles.roles) return false;
    
    const group = menuData.find(g => g.groupId === groupId);
    if (!group) return false;
    
    if (group.isLink) {
      const role = employeeRoles.roles.find(r => r.menuGroupId === groupId);
      return role && (role.read || role.write || role.delete || role.edit || role.print || role.mail);
    } else if (group.menus) {
      const checkAnyMenus = (menus) => {
        return menus.some(menu => {
          const role = employeeRoles.roles.find(r => r.menuId === menu.id);
          const hasAny = role && (role.read || role.write || role.delete || role.edit || role.print || role.mail);
          if (menu.children && menu.children.length > 0) {
            return hasAny || checkAnyMenus(menu.children);
          }
          return hasAny;
        });
      };
      return checkAnyMenus(group.menus);
    }
    
    return false;
  };
  
  // Save employee roles
  const saveEmployeeRoles = async () => {
    if (!selectedRole || !employeeRoles) return;

    setSaveLoading(true);
    try {
      if (employeeRoles._id) {
        // Update existing roles
        await updateEmployeeRoles(selectedRole.value, {
          roleId: selectedRole.value,
          roles: employeeRoles.roles
        });
        toast.success("Employee roles updated successfully");
      } else {
        // Create new roles
        await createEmployeeRoles({
          roleId: selectedRole.value,
          roles: employeeRoles.roles
        });
        toast.success("Employee roles created successfully");
      }
      
      // Refresh employee roles
      fetchEmployeeRoles(selectedRole.value);
      // Update the roles list to reflect that this employee now has roles
      setRoles(roles.map(role => 
        role.value === selectedRole.value ? { ...role } : role
      ));
    } catch (error) {
      console.error("Error saving employee roles:", error);
      toast.error("Failed to save employee roles");
    } finally {
      setSaveLoading(false);
    }
  };
  
  // Get appropriate styles based on hover state and permissions
  const getRowStyles = (id, isGroup) => {
    const hasAny = hasAnyPermissions(id, isGroup);
    const isHovered = hoveredRow === id;
    
    let bgColor = '';
    
    if (isHovered) {
      bgColor = 'rgba(0, 123, 255, 0.05)';
    } else if (hasAny) {
      bgColor = 'rgba(40, 167, 69, 0.05)';
    }
    
    return {
      backgroundColor: bgColor,
      transition: 'background-color 0.2s'
    };
  };
  
  // Recursive function to render menu items and their checkboxes
  const renderMenuItems = (menuItems, depth = 0) => {
    if (!menuItems || menuItems.length === 0) return null;
    
    return menuItems.map(menu => {
      // Generate a unique, safe ID for the menu item
      const menuBadgeId = `menu-badge-${menu.id.toString().replace(/[^a-zA-Z0-9]/g, '-')}`;
      const toggleBtnId = `toggle-btn-${menu.id.toString().replace(/[^a-zA-Z0-9]/g, '-')}`;
      const isParentMenu = menu.isParent;
      
      return (
        <React.Fragment key={menu.id}>
          <tr 
            style={getRowStyles(menu.id, false)} 
            onMouseEnter={() => setHoveredRow(menu.id)}
            onMouseLeave={() => setHoveredRow(null)}
          >
            <td style={{ paddingLeft: `${depth * 2}rem` }} className="menu-name-cell">
              {depth > 0 && (
                <i className="bx bx-subdirectory-right me-2 text-muted"></i>
              )}
              <span className={depth === 0 && menu.isParent ? "fw-bold" : ""}>
                {menu.isParent ? (
                  <i className="bx bx-folder me-1 text-primary"></i>
                ) : (
                  <i className="bx bx-file me-1 text-info"></i>
                )}
                {menu.name}
              </span>
              
              {hasAllPermissions(menu.id, false) && (
                <>
                  <Badge color="success" className="ms-2" pill id={menuBadgeId}>
                    All
                  </Badge>
                  <UncontrolledTooltip placement="top" target={menuBadgeId}>
                    Full access granted
                  </UncontrolledTooltip>
                </>
              )}
              
              <div className="float-end">
                <Button
                  color="light"
                  size="sm"
                  className="btn-sm py-0 px-1"
                  onClick={() => handleAllPermissions(menu.id, false, !hasAllPermissions(menu.id, false))}
                  id={toggleBtnId}
                >
                  {hasAllPermissions(menu.id, false) ? (
                    <i className="bx bx-x text-danger"></i>
                  ) : (
                    <i className="bx bx-check text-success"></i>
                  )}
                </Button>
                <UncontrolledTooltip placement="top" target={toggleBtnId}>
                  {hasAllPermissions(menu.id, false) ? "Revoke all permissions" : "Grant all permissions"}
                </UncontrolledTooltip>
              </div>
            </td>
            <td className="text-center permission-cell">
              <Input
                type="checkbox"
                checked={hasPermission(menu.id, false, "read")}
                onChange={(e) => handlePermissionChange(menu.id, false, "read", e.target.checked)}
                className="permission-checkbox"
              />
            </td>
            <td className="text-center permission-cell">
              <Input
                type="checkbox"
                checked={hasPermission(menu.id, false, "write")}
                onChange={(e) => handlePermissionChange(menu.id, false, "write", e.target.checked)}
                className="permission-checkbox"
              />
            </td>
            <td className="text-center permission-cell">
              <Input
                type="checkbox"
                checked={hasPermission(menu.id, false, "delete")}
                onChange={(e) => handlePermissionChange(menu.id, false, "delete", e.target.checked)}
                className="permission-checkbox"
              />
            </td>
            <td className="text-center permission-cell">
              <Input
                type="checkbox"
                checked={hasPermission(menu.id, false, "edit")}
                onChange={(e) => handlePermissionChange(menu.id, false, "edit", e.target.checked)}
                className="permission-checkbox"
              />
            </td>
            <td className="text-center permission-cell">
              <Input
                type="checkbox"
                checked={hasPermission(menu.id, false, "print")}
                onChange={(e) => handlePermissionChange(menu.id, false, "print", e.target.checked)}
                className="permission-checkbox"
              />
            </td>
            <td className="text-center permission-cell">
              <Input
                type="checkbox"
                checked={hasPermission(menu.id, false, "mail")}
                onChange={(e) => handlePermissionChange(menu.id, false, "mail", e.target.checked)}
                className="permission-checkbox"
              />
            </td>
          </tr>
          {/* Recursively render children */}
          {menu.children && menu.children.length > 0 && renderMenuItems(menu.children, depth + 1)}
        </React.Fragment>
      );
    });
  };

  document.title = `Employee Roles | ${adminData.companyName}`;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb
            maintitle="Setup"
            title="Employee Roles"
            pageTitle="Setup"
          />
          
          <Card className="shadow-sm">
            <CardHeader className="bg-light d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="bx bx-user-circle me-2 text-primary"></i>
                Role Management
              </h5>
              {(!menuData || menuData.length === 0) && (
                <Button 
                  color="secondary" 
                  size="sm" 
                  onClick={fetchAllMenuData}
                >
                  <i className="bx bx-refresh me-1"></i>
                  Reload Menus
                </Button>
              )}
            </CardHeader>
            <CardBody>
              <Row className="mb-4">
                <Col md={3}>
                  <FormGroup>
                    <Label htmlFor="employeeSelect" className="fw-bold">
                      <i className="bx bx-user me-1"></i> Select Role
                    </Label>
                    <Select
                      id="employeeSelect"
                      options={roles}
                      value={selectedRole}
                      onChange={setSelectedRole}
                      className="basic-single"
                      classNamePrefix="select"
                      placeholder="Select a role..."
                      isDisabled={loading}
                      isClearable
                      formatOptionLabel={option => (
                        <div>
                          {option.label}
                        </div>
                      )}
                    />
                  </FormGroup>
                </Col>
                <Col md={9} className="d-flex align-items-end justify-content-end">
                  {selectedRole && (
                    <Button
                      color="primary"
                      className="mt-md-0 mt-2"
                      onClick={saveEmployeeRoles}
                      disabled={saveLoading || !rolesChanged}
                    >
                      {saveLoading ? (
                        <>
                          <Spinner size="sm" className="me-1" /> Saving...
                        </>
                      ) : (
                        <>
                          <i className="bx bx-save me-1"></i> Save Roles
                        </>
                      )}
                    </Button>
                  )}
                </Col>
              </Row>

              {rolesChanged && selectedRole && (
                <Alert color="warning" className="d-flex align-items-center mb-3">
                  <i className="bx bx-info-circle me-2 fs-5"></i>
                  <div>
                    You have unsaved changes to the permissions. Click "Save Roles" to apply the changes.
                  </div>
                </Alert>
              )}
              {selectedRole ? (
                <div className="mt-4 menu-roles-table-container">
                  <div className="table-responsive">
                    <Table bordered hover className="menu-roles-table">
                      <thead>
                        <tr className="bg-light">
                          <th style={{ width: "40%" }}>Menu</th>
                          <th style={{ width: "10%" }} className="text-center">
                            <div className="d-flex flex-column align-items-center">
                              <span>Read</span>
                              <Input
                                type="checkbox"
                                checked={hasColumnAllPermissions("read")}
                                onChange={(e) => handleColumnPermissionChange("read", e.target.checked)}
                                className="permission-checkbox mt-1"
                                style={{ width: "16px", height: "16px" }}
                              />
                            </div>
                          </th>
                          <th style={{ width: "10%" }} className="text-center">
                            <div className="d-flex flex-column align-items-center">
                              <span>Write</span>
                              <Input
                                type="checkbox"
                                checked={hasColumnAllPermissions("write")}
                                onChange={(e) => handleColumnPermissionChange("write", e.target.checked)}
                                className="permission-checkbox mt-1"
                                style={{ width: "16px", height: "16px" }}
                              />
                            </div>
                          </th>
                          <th style={{ width: "10%" }} className="text-center">
                            <div className="d-flex flex-column align-items-center">
                              <span>Delete</span>
                              <Input
                                type="checkbox"
                                checked={hasColumnAllPermissions("delete")}
                                onChange={(e) => handleColumnPermissionChange("delete", e.target.checked)}
                                className="permission-checkbox mt-1"
                                style={{ width: "16px", height: "16px" }}
                              />
                            </div>
                          </th>
                          <th style={{ width: "10%" }} className="text-center">
                            <div className="d-flex flex-column align-items-center">
                              <span>Edit</span>
                              <Input
                                type="checkbox"
                                checked={hasColumnAllPermissions("edit")}
                                onChange={(e) => handleColumnPermissionChange("edit", e.target.checked)}
                                className="permission-checkbox mt-1"
                                style={{ width: "16px", height: "16px" }}
                              />
                            </div>
                          </th>
                          <th style={{ width: "10%" }} className="text-center">
                            <div className="d-flex flex-column align-items-center">
                              <span>Print</span>
                              <Input
                                type="checkbox"
                                checked={hasColumnAllPermissions("print")}
                                onChange={(e) => handleColumnPermissionChange("print", e.target.checked)}
                                className="permission-checkbox mt-1"
                                style={{ width: "16px", height: "16px" }}
                              />
                            </div>
                          </th>
                          <th style={{ width: "10%" }} className="text-center">
                            <div className="d-flex flex-column align-items-center">
                              <span>Mail</span>
                              <Input
                                type="checkbox"
                                checked={hasColumnAllPermissions("mail")}
                                onChange={(e) => handleColumnPermissionChange("mail", e.target.checked)}
                                className="permission-checkbox mt-1"
                                style={{ width: "16px", height: "16px" }}
                              />
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {menuData && menuData.length > 0 ? (
                          menuData.map((group, index) => {
                            // Generate safe IDs for group elements
                            const groupBadgeId = `group-badge-${group.groupId.toString().replace(/[^a-zA-Z0-9]/g, '-')}`;
                            const groupToggleId = `group-toggle-${group.groupId.toString().replace(/[^a-zA-Z0-9]/g, '-')}`;
                            
                            return (
                              <React.Fragment key={group.groupId}>
                                {/* Menu Group Header */}
                                <tr className="table-primary">
                                  <td colSpan={7} className="fw-bold">
                                    <div className="d-flex align-items-center justify-content-between">
                                      <div className="d-flex align-items-center">
                                        <Input
                                          type="checkbox"
                                          checked={hasGroupAllPermissions(group.groupId)}
                                          onChange={(e) => handleAllGroupPermissions(group.groupId, e.target.checked)}
                                          className="permission-checkbox me-2"
                                          style={{ width: "16px", height: "16px" }}
                                        />
                                        <i className="bx bx-category me-2"></i>
                                        {group.groupName}
                                      </div>
                                      {hasGroupAnyPermissions(group.groupId) && (
                                        <Badge color="info" className="ms-2" pill>
                                          <i className="bx bx-check me-1"></i>
                                          Permissions Set
                                        </Badge>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                                
                                {/* Direct Link Group */}
                                {group.isLink && (
                                  <tr 
                                    style={getRowStyles(group.groupId, true)}
                                    onMouseEnter={() => setHoveredRow(group.groupId)}
                                    onMouseLeave={() => setHoveredRow(null)}
                                  >
                                    <td className="menu-name-cell">
                                      <i className="bx bx-link me-1 text-success"></i>
                                      {group.groupName}
                                      
                                      {hasAllPermissions(group.groupId, true) && (
                                        <>
                                          <Badge color="success" className="ms-2" pill id={groupBadgeId}>
                                            All
                                          </Badge>
                                          <UncontrolledTooltip placement="top" target={groupBadgeId}>
                                            Full access granted
                                          </UncontrolledTooltip>
                                        </>
                                      )}
                                      
                                      <div className="float-end">
                                        <Button
                                          color="light"
                                          size="sm"
                                          className="btn-sm py-0 px-1"
                                          onClick={() => handleAllPermissions(group.groupId, true, !hasAllPermissions(group.groupId, true))}
                                          id={groupToggleId}
                                        >
                                          {hasAllPermissions(group.groupId, true) ? (
                                            <i className="bx bx-x text-danger"></i>
                                          ) : (
                                            <i className="bx bx-check text-success"></i>
                                          )}
                                        </Button>
                                        <UncontrolledTooltip placement="top" target={groupToggleId}>
                                          {hasAllPermissions(group.groupId, true) ? "Revoke all permissions" : "Grant all permissions"}
                                        </UncontrolledTooltip>
                                      </div>
                                    </td>
                                    <td className="text-center permission-cell">
                                      <Input
                                        type="checkbox"
                                        checked={hasPermission(group.groupId, true, "read")}
                                        onChange={(e) => 
                                          handlePermissionChange(group.groupId, true, "read", e.target.checked)
                                        }
                                        className="permission-checkbox"
                                      />
                                    </td>
                                    <td className="text-center permission-cell">
                                      <Input
                                        type="checkbox"
                                        checked={hasPermission(group.groupId, true, "write")}
                                        onChange={(e) => 
                                          handlePermissionChange(group.groupId, true, "write", e.target.checked)
                                        }
                                        className="permission-checkbox"
                                      />
                                    </td>
                                    <td className="text-center permission-cell">
                                      <Input
                                        type="checkbox"
                                        checked={hasPermission(group.groupId, true, "delete")}
                                        onChange={(e) => 
                                          handlePermissionChange(group.groupId, true, "delete", e.target.checked)
                                        }
                                        className="permission-checkbox"
                                      />
                                    </td>
                                    <td className="text-center permission-cell">
                                      <Input
                                        type="checkbox"
                                        checked={hasPermission(group.groupId, true, "edit")}
                                        onChange={(e) => 
                                          handlePermissionChange(group.groupId, true, "edit", e.target.checked)
                                        }
                                        className="permission-checkbox"
                                      />
                                    </td>
                                    <td className="text-center permission-cell">
                                      <Input
                                        type="checkbox"
                                        checked={hasPermission(group.groupId, true, "print")}
                                        onChange={(e) => 
                                          handlePermissionChange(group.groupId, true, "print", e.target.checked)
                                        }
                                        className="permission-checkbox"
                                      />
                                    </td>
                                    <td className="text-center permission-cell">
                                      <Input
                                        type="checkbox"
                                        checked={hasPermission(group.groupId, true, "mail")}
                                        onChange={(e) => 
                                          handlePermissionChange(group.groupId, true, "mail", e.target.checked)
                                        }
                                        className="permission-checkbox"
                                      />
                                    </td>
                                  </tr>
                                )}
                                
                                {/* Group's menus with their nested children */}
                                {!group.isLink && group.menus && group.menus.length > 0 && renderMenuItems(group.menus)}
                                
                                {/* Empty group message */}
                                {!group.isLink && (!group.menus || group.menus.length === 0) && (
                                  <tr>
                                    <td colSpan={7} className="text-center text-muted">
                                      <i className="bx bx-info-circle me-1"></i>
                                      <i>No menus in this group</i>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={7} className="text-center py-5">
                              <div className="text-muted">
                                <i className="bx bx-menu fs-1 d-block mb-2"></i>
                                No menu data available
                              </div>
                              <Button 
                                color="primary" 
                                size="sm" 
                                className="mt-2"
                                onClick={fetchAllMenuData}
                              >
                                <i className="bx bx-refresh me-1"></i>
                                Reload Menus
                              </Button>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </div>
                  
                  {menuData && menuData.length > 0 && (
                    <div className="text-center text-muted small mt-3">
                      <i className="bx bx-bulb me-1"></i>
                      Tip: Use the checkboxes in column headers to select entire columns, group headers to select all menus in a group, or individual checkboxes for specific permissions.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-5 my-4 border rounded bg-light">
                  <div className="avatar-lg mx-auto mb-4">
                    <div className="avatar-title bg-white text-primary display-5 rounded-circle shadow-sm">
                      <i className="bx bx-user-circle"></i>
                    </div>
                  </div>
                  <h5>Select a Role</h5>
                  <p className="text-muted">
                    Please select a role from the dropdown above to manage its permissions
                  </p>
                </div>
              )}
            </CardBody>
          </Card>
        </Container>
      </div>
      
      <style jsx>{`
        .menu-roles-table th, .menu-roles-table td {
          vertical-align: middle;
        }
        
        .menu-name-cell {
          position: relative;
        }
        
        .permission-cell {
          width: 80px;
          text-align: center;
        }
        
        .permission-checkbox {
          cursor: pointer;
          width: 18px;
          height: 18px;
        }
        
        .table-responsive {
          max-height: calc(100vh - 300px);
          overflow-y: auto;
        }
        
        .table-primary td {
          background-color: rgba(13, 110, 253, 0.15) !important;
        }
      `}</style>
    </React.Fragment>
  );
};

export default EmployeeRoles;