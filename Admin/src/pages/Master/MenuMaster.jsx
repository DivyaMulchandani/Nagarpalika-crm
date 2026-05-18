import React, { useState, useEffect, useContext } from "react";
import { Card, CardBody, CardHeader, Col, Container, Row } from "reactstrap";
import DataTable from "react-data-table-component";
import { useNavigate } from "react-router-dom";
import { deleteMenu, searchMenus } from "../../api/menus.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import DeleteModal from "../../Components/Common/DeleteModal";
import FormsHeader from "../../Components/Common/FormsModalHeader";
import { toast } from "react-toastify";
import { MenuContext } from "../../context/MenuContext";
import IconPicker from "../../Components/Common/IconPicker";
import { AuthContext } from "../../context/AuthContext";

const initialState = {
    menuName: "",
    menuGroup: "",
    menuUrl: "",
    sequence: "",
    isActive: true,
    isParent: false,
    parentMenu: null,
    icon: "",
};

const MenuMaster = () => {
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions } = useContext(MenuContext);
  const navigate = useNavigate();

  const [filter, setFilter] = useState(true);
  const [query, setQuery] = useState("");
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(100);
  const [pageNo, setPageNo] = useState(0);
  const [column, setcolumn] = useState();
  const [sortDirection, setsortDirection] = useState();
  const [remove_id, setRemove_id] = useState("");
  const [modal_delete, setmodal_delete] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  useEffect(() => { fetchMenus(); }, [pageNo, perPage, column, sortDirection, query, filter]);

  const fetchMenus = async () => {
    setLoading(true);
    let skip = (pageNo - 1) * perPage;
    if (skip < 0) skip = 0;
    try {
      const response = await searchMenus({ skip, per_page: perPage, sorton: column, sortdir: sortDirection, match: query, isActive: filter });
      if (response.data.data.length > 0) {
        setMenus(response.data.data[0].data);
        setTotalRows(response.data.data[0].count);
      } else {
        setMenus([]);
      }
    } catch {
      setMenus([]);
    }
    setLoading(false);
  };

  const handleDelete = (e) => {
    e.preventDefault();
    setIsDeleteLoading(true);
    deleteMenu(remove_id)
      .then(() => { setmodal_delete(false); fetchMenus(); toast.success("Menu Removed Successfully!"); })
      .catch(() => toast.error("Failed to remove menu. Please try again."))
      .finally(() => setIsDeleteLoading(false));
  };

  const col = [
    { name: "Sr No", selector: (row, index) => index + 1, maxWidth: "20px" },
    { name: "Menu Name", selector: (row) => row.menuName, sortable: true, sortField: "menuName", minWidth: "130px" },
    { name: "Menu Group", selector: (row) => row.menuGroup?.menuGroupName || row.menuGroup, sortable: true, sortField: "menuGroup.menuGroupName", minWidth: "130px" },
    { name: "Menu URL", selector: (row) => row.menuUrl, minWidth: "150px" },
    { name: "Sequence", selector: (row) => row.sequence, sortable: true, sortField: "sequence", minWidth: "100px" },
    {
      name: "Action",
      selector: (row) => (
        <div className="d-flex gap-2">
          {currentPagePermissions.read && (
            <button className="btn btn-sm btn-info" onClick={() => navigate(`/menu-master/${row._id}`)}>View</button>
          )}
          {currentPagePermissions.edit && (
            <button className="btn btn-sm btn-success" onClick={() => navigate(`/menu-master/${row._id}/edit`)}>Edit</button>
          )}
          {currentPagePermissions.delete && (
            <button className="btn btn-sm btn-danger" onClick={() => { setmodal_delete(true); setRemove_id(row._id); }}>Remove</button>
          )}
          {!currentPagePermissions.read && !currentPagePermissions.edit && !currentPagePermissions.delete && (
            <span className="text-muted">No actions available</span>
          )}
        </div>
      ),
      minWidth: "220px",
    },
  ];

  document.title = `Menu Master | ${adminData?.companyName}`;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb maintitle="Master" title="Menu Master" pageTitle="Master" />
          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader>
                  <FormsHeader
                    formName="Menu Master"
                    filter={filter}
                    handleFilter={(e) => { setPageNo(1); setFilter(e.target.checked); }}
                    tog_list={() => navigate("/menu-master/add")}
                    setQuery={setQuery}
                    showAddButton={currentPagePermissions.write}
                  />
                </CardHeader>
                <CardBody>
                  <div className="table-responsive table-card mt-1 mb-1">
                    <DataTable
                      columns={col}
                      data={menus}
                      progressPending={loading}
                      sortServer
                      onSort={(col, dir) => { setcolumn(col.sortField); setsortDirection(dir); }}
                      pagination
                      paginationServer
                      paginationTotalRows={totalRows}
                      paginationPerPage={100}
                      paginationRowsPerPageOptions={[50, 100, 200, 300, totalRows]}
                      onChangeRowsPerPage={(n) => setPerPage(n)}
                      onChangePage={(p) => setPageNo(p)}
                    />
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
      <DeleteModal
        show={modal_delete}
        handleDelete={handleDelete}
        toggle={() => setmodal_delete(false)}
        setmodal_delete={setmodal_delete}
        disabled={isDeleteLoading}
      />
    </React.Fragment>
  );
};

export default MenuMaster;
