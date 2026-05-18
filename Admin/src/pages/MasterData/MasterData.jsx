import React, { useState, useEffect, useContext } from "react";
import {
  Card, CardBody, CardHeader, Col, Container, Row,
  Nav, NavItem, NavLink,
} from "reactstrap";
import DataTable from "react-data-table-component";
import { useNavigate } from "react-router-dom";
import { getMasterData, deleteMasterData } from "../../api/masterData.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import DeleteModal from "../../Components/Common/DeleteModal";
import FormsHeader from "../../Components/Common/FormsModalHeader";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";
import classnames from "classnames";

const categories = [
  { id: "TITLE", name: "Titles", group: "Patient" },
  { id: "GENDER", name: "Gender", group: "Patient" },
  { id: "BLOOD_GROUP", name: "Blood Groups", group: "Patient" },
  { id: "MARITAL_STATUS", name: "Marital Status", group: "Patient" },
  { id: "RELATIONSHIP_TYPE", name: "Relationship Types", group: "Patient" },
  { id: "ID_PROOF_TYPE", name: "ID Proof Types", group: "Patient" },
  { id: "OCCUPATION_TYPE", name: "Occupation Types", group: "Patient" },
  { id: "REFERRAL_SOURCE", name: "Referral Sources", group: "Patient" },
  { id: "CHIEF_COMPLAINT", name: "Chief Complaints", group: "Clinical" },
  { id: "DIAGNOSIS", name: "Diagnosis / Conditions", group: "Clinical" },
  { id: "PROCEDURE", name: "Procedures / Treatments", group: "Clinical" },
  { id: "MEDICINE_FREQUENCY", name: "Medicine Frequencies", group: "Clinical" },
  { id: "MEDICINE_DOSAGE_UNIT", name: "Medicine Dosage Units", group: "Clinical" },
  { id: "MEDICINE_DURATION_UNIT", name: "Medicine Duration Units", group: "Clinical" },
  { id: "ALLERGY_TYPE", name: "Allergy Types", group: "Clinical" },
  { id: "VITAL_SIGN", name: "Vital Signs", group: "Clinical" },
  { id: "CLINICAL_NOTE_TYPE", name: "Clinical Note Types", group: "Clinical" },
  { id: "APPOINTMENT_TYPE", name: "Appointment Types", group: "Appointment" },
  { id: "APPOINTMENT_SOURCE", name: "Appointment Sources", group: "Appointment" },
  { id: "CANCELLATION_REASON", name: "Cancellation Reasons", group: "Appointment" },
  { id: "TIME_SLOT_DURATION", name: "Time Slot Durations", group: "Appointment" },

  { id: "SPECIALIZATION", name: "Specializations", group: "Staff" },

  { id: "PAYMENT_METHOD", name: "Payment Methods", group: "Billing" },
  { id: "DISCOUNT_TYPE", name: "Discount Types", group: "Billing" },
  { id: "TAX_TYPE", name: "Tax Types", group: "Billing" },
  { id: "TAX_RATE", name: "Tax Rates", group: "Billing" },
  { id: "CLINIC_TYPE", name: "Clinic Types", group: "Config" },
  { id: "WORKING_DAY", name: "Working Days", group: "Config" },
  { id: "HOLIDAY_TYPE", name: "Holiday Types", group: "Config" },
  { id: "FILE_UPLOAD_CATEGORY", name: "File Upload Categories", group: "Config" },
  { id: "TOOTH_NUMBER", name: "Tooth Numbers", group: "Dental" },
  { id: "TOOTH_SURFACE", name: "Tooth Surfaces", group: "Dental" },
  { id: "TOOTH_CONDITION", name: "Tooth Conditions", group: "Dental" },
];

const groups = ["Patient", "Clinical", "Appointment", "Staff", "Billing", "Config", "Dental"];

const MasterData = () => {
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions } = useContext(MenuContext);
  const navigate = useNavigate();

  const [activeCategory, setActiveCategory] = useState("TITLE");
  const [filter, setFilter] = useState(true);
  const [query, setQuery] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [remove_id, setRemove_id] = useState("");
  const [modal_delete, setmodal_delete] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  useEffect(() => { fetchData(); }, [activeCategory, filter, query]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await getMasterData({ category: activeCategory, isActive: filter, search: query });
      setData(response.data.data || []);
    } catch {
      setData([]);
    }
    setLoading(false);
  };

  const handleDelete = (e) => {
    e.preventDefault();
    setIsDeleteLoading(true);
    deleteMasterData(remove_id)
      .then(() => { setmodal_delete(false); fetchData(); toast.success("Removed Successfully!"); })
      .catch(() => { setmodal_delete(false); toast.error("Failed to delete. Please try again."); })
      .finally(() => setIsDeleteLoading(false));
  };

  const col = [
    { name: "Code", selector: (row) => row.code, sortable: true, minWidth: "150px" },
    { name: "Label", selector: (row) => row.label, sortable: true, minWidth: "200px" },
    { name: "Order", selector: (row) => row.order, sortable: true, minWidth: "100px" },
    { name: "Status", selector: (row) => (row.isActive ? "Active" : "Inactive"), minWidth: "100px" },
    {
      name: "Action",
      selector: (row) => (
        <div className="d-flex gap-2">
          {currentPagePermissions?.read && (
            <button className="btn btn-sm btn-info" onClick={() => navigate(`/master-data/${row._id}`)}>View</button>
          )}
          {currentPagePermissions?.edit && (
            <button className="btn btn-sm btn-success" onClick={() => navigate(`/master-data/${row._id}/edit`)}>Edit</button>
          )}
          {currentPagePermissions?.delete && (
            <button className="btn btn-sm btn-danger" onClick={() => { setmodal_delete(true); setRemove_id(row._id); }}>Remove</button>
          )}
        </div>
      ),
      minWidth: "220px",
    },
  ];

  document.title = `Master Data | ${adminData?.companyName}`;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb maintitle="Setup" title="Master Data" pageTitle="Setup" />
          <Row>
            <Col lg={3}>
              <Card>
                <CardBody>
                  <div className="mb-3">
                    <h5 className="fs-14 font-weight-bold">Categories</h5>
                  </div>
                  <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
                    {groups.map((group) => (
                      <div key={group} className="mb-4">
                        <h6 className="text-muted text-uppercase fs-12 mb-2">{group}</h6>
                        <Nav className="flex-column nav-pills">
                          {categories.filter((c) => c.group === group).map((cat) => (
                            <NavItem key={cat.id}>
                              <NavLink
                                href="#"
                                className={classnames({ active: activeCategory === cat.id }, "mb-1")}
                                onClick={(e) => { e.preventDefault(); setActiveCategory(cat.id); setQuery(""); }}
                              >
                                {cat.name}
                              </NavLink>
                            </NavItem>
                          ))}
                        </Nav>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            </Col>

            <Col lg={9}>
              <Card>
                <CardHeader>
                  <FormsHeader
                    formName={`${categories.find((c) => c.id === activeCategory)?.name || "Master"} List`}
                    filter={filter}
                    handleFilter={(e) => setFilter(e.target.checked)}
                    tog_list={() => navigate(`/master-data/add?category=${activeCategory}`)}
                    setQuery={setQuery}
                    showAddButton={currentPagePermissions?.write !== false}
                  />
                </CardHeader>
                <CardBody>
                  <DataTable
                    columns={col}
                    data={data}
                    progressPending={loading}
                    pagination
                    paginationPerPage={50}
                  />
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

export default MasterData;
