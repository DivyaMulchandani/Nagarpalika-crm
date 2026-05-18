import React, { useState, useEffect, useContext } from "react";
import {
    Card,
    CardBody,
    CardHeader,
    Col,
    Container,
    Input,
    Label,
    Row,
    Button,
} from "reactstrap";
import DataTable from "react-data-table-component";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import DeleteModal from "../../Components/Common/DeleteModal";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";
import {
    deletePatient,
    restorePatient,
    searchPatients,
} from "../../api/patients.api";

const computeAge = (dob) => {
    if (!dob) return "-";
    const d = new Date(dob);
    if (Number.isNaN(d.getTime())) return "-";
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
    return age >= 0 ? age : "-";
};

const statusBadge = (status) => {
    const map = {
        partial: "badge bg-warning",
        active: "badge bg-success",
        inactive: "badge bg-secondary",
    };
    return (
        <span className={map[status] || "badge bg-light text-dark"}>
            {status || "-"}
        </span>
    );
};

const Patients = () => {
    const navigate = useNavigate();
    const { adminData } = useContext(AuthContext);
    const { currentPagePermissions } = useContext(MenuContext);

    // Doctors should not access the patient list directly
    useEffect(() => {
        if (adminData?.role === "DOCTOR") {
            toast.info("Doctors can view patient details through appointments.");
            navigate("/dashboard", { replace: true });
        }
    }, [adminData, navigate]);

    const [patients, setPatients] = useState([]);
    const [filter, setFilter] = useState(true);
    const [showDeleted, setShowDeleted] = useState(false);
    const [query, setQuery] = useState("");

    const [loading, setLoading] = useState(false);
    const [totalRows, setTotalRows] = useState(0);
    const [perPage, setPerPage] = useState(100);
    const [pageNo, setPageNo] = useState(0);
    const [column, setcolumn] = useState();
    const [sortDirection, setsortDirection] = useState();

    const [modal_delete, setmodal_delete] = useState(false);
    const [remove_id, setRemove_id] = useState("");
    const [isDeleteLoading, setIsDeleteLoading] = useState(false);

    const handleSort = (col, dir) => {
        setcolumn(col.sortField);
        setsortDirection(dir);
    };

    useEffect(() => {
        fetchPatients();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageNo, perPage, column, sortDirection, query, filter, showDeleted]);

    const fetchPatients = async () => {
        setLoading(true);
        let skip = (pageNo - 1) * perPage;
        if (skip < 0) skip = 0;

        try {
            const response = await searchPatients({
                skip,
                per_page: perPage,
                sorton: column,
                sortdir: sortDirection,
                match: query,
                isActive: filter,
                isDeleted: showDeleted,
            });

            if (
                response.data.data &&
                Array.isArray(response.data.data) &&
                response.data.data.length > 0
            ) {
                const res = response.data.data[0];
                setTotalRows(res.count || 0);
                setPatients(res.data || []);
            } else {
                setPatients([]);
                setTotalRows(0);
            }
        } catch (err) {
            console.error("Error fetching patients:", err);
            setPatients([]);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (page) => setPageNo(page);
    const handlePerRowsChange = async (newPerPage) => setPerPage(newPerPage);

    const handleFilter = (e) => {
        setPageNo(1);
        setFilter(e.target.checked);
    };

    const handleShowDeleted = (e) => {
        setPageNo(1);
        setShowDeleted(e.target.checked);
    };

    const tog_delete = (id) => {
        setRemove_id(id);
        setmodal_delete(true);
    };

    const handleDelete = (e) => {
        e.preventDefault();
        setIsDeleteLoading(true);
        deletePatient(remove_id)
            .then(() => {
                setmodal_delete(false);
                toast.success("Patient removed successfully");
                fetchPatients();
            })
            .catch((err) => {
                console.error(err);
                toast.error(
                    err?.response?.data?.message ||
                        "Failed to remove patient",
                );
            })
            .finally(() => {
                setIsDeleteLoading(false);
            });
    };

    const handleDeleteClose = (e) => {
        e.preventDefault();
        setmodal_delete(false);
    };

    const handleRestore = (id) => {
        restorePatient(id)
            .then(() => {
                toast.success("Patient restored successfully");
                fetchPatients();
            })
            .catch((err) => {
                console.error(err);
                toast.error(
                    err?.response?.data?.message ||
                        "Failed to restore patient",
                );
            });
    };

    const fullName = (row) =>
        `${row.firstName || ""} ${row.lastName || ""}`.trim() || "-";

    const col = [
        {
            name: "Sr No",
            selector: (row, index) => index + 1,
            sortable: false,
            maxWidth: "20px",
        },
        {
            name: "Patient ID",
            selector: (row) => row.patientId,
            sortable: true,
            sortField: "patientId",
            minWidth: "150px",
        },
        {
            name: "Name",
            selector: (row) => fullName(row),
            sortable: true,
            sortField: "firstName",
            minWidth: "180px",
        },
        {
            name: "Mobile",
            selector: (row) => row.mobileNumber || "-",
            minWidth: "130px",
        },
        {
            name: "Gender",
            selector: (row) => row.gender?.label || "-",
            minWidth: "100px",
        },
        {
            name: "Age",
            selector: (row) => row.age ?? computeAge(row.dateOfBirth),
            minWidth: "70px",
        },
        {
            name: "Status",
            selector: (row) => statusBadge(row.status),
            minWidth: "120px",
        },
        {
            name: "Created",
            selector: (row) =>
                row.createdAt
                    ? new Date(row.createdAt).toLocaleDateString()
                    : "-",
            sortable: true,
            sortField: "createdAt",
            minWidth: "110px",
        },
        {
            name: "Action",
            selector: (row) => (
                <div className="d-flex gap-2">
                    {!showDeleted && (
                        <>
                            <button
                                className="btn btn-sm btn-info"
                                onClick={() => navigate(`/patient/${row._id}`)}
                            >
                                View
                            </button>
                            {currentPagePermissions?.edit && (
                                <button
                                    className="btn btn-sm btn-success"
                                    onClick={() =>
                                        navigate(
                                            `/patients/${row._id}/edit`,
                                        )
                                    }
                                >
                                    Edit
                                </button>
                            )}
                            {currentPagePermissions?.delete && (
                                <button
                                    className="btn btn-sm btn-danger"
                                    onClick={() => tog_delete(row._id)}
                                >
                                    Remove
                                </button>
                            )}
                        </>
                    )}
                    {showDeleted && currentPagePermissions?.edit && (
                        <button
                            className="btn btn-sm btn-warning"
                            onClick={() => handleRestore(row._id)}
                        >
                            Restore
                        </button>
                    )}
                </div>
            ),
            sortable: false,
            minWidth: "240px",
        },
    ];

    document.title = `Patients | ${adminData?.companyName || ""}`;

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb
                        maintitle="Patients"
                        title="Patients"
                        pageTitle="Patients"
                    />
                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardHeader>
                                    <Row className="g-3 align-items-center">
                                        <Col sm={6} md={3}>
                                            <h2 className="card-title mb-0 fs-4">
                                                Patients
                                            </h2>
                                        </Col>
                                        <Col sm={6} md={2}>
                                            <Input
                                                type="checkbox"
                                                className="form-check-input"
                                                checked={filter}
                                                onChange={handleFilter}
                                                disabled={showDeleted}
                                            />
                                            <Label className="form-check-label ms-2">
                                                Active
                                            </Label>
                                        </Col>
                                        <Col sm={6} md={2}>
                                            <Input
                                                type="checkbox"
                                                className="form-check-input"
                                                checked={showDeleted}
                                                onChange={handleShowDeleted}
                                            />
                                            <Label className="form-check-label ms-2">
                                                Show deleted
                                            </Label>
                                        </Col>
                                        <Col sm={12} md={5}>
                                            <div className="d-flex justify-content-end gap-2">
                                                {currentPagePermissions?.write && (
                                                    <>
                                                        <Button
                                                            color="success"
                                                            onClick={() =>
                                                                navigate(
                                                                    "/patients/new",
                                                                )
                                                            }
                                                        >
                                                            <i className="ri-add-line align-bottom me-1"></i>
                                                            Add Patient
                                                        </Button>
                                                        <Button
                                                            color="primary"
                                                            outline
                                                            onClick={() =>
                                                                navigate(
                                                                    "/patients/new?mode=quick",
                                                                )
                                                            }
                                                        >
                                                            Quick Add
                                                        </Button>
                                                    </>
                                                )}
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    style={{ maxWidth: 220 }}
                                                    placeholder="Search name / mobile / patient ID"
                                                    onChange={(e) =>
                                                        setQuery(e.target.value)
                                                    }
                                                />
                                            </div>
                                        </Col>
                                    </Row>
                                </CardHeader>

                                <CardBody>
                                    <div className="table-responsive table-card mt-1 mb-1 text-right">
                                        <DataTable
                                            columns={col}
                                            data={patients}
                                            progressPending={loading}
                                            sortServer
                                            onSort={(c, d) => handleSort(c, d)}
                                            pagination
                                            paginationServer
                                            paginationTotalRows={totalRows}
                                            paginationPerPage={100}
                                            paginationRowsPerPageOptions={[
                                                50, 100, 200, 300,
                                            ]}
                                            onChangeRowsPerPage={
                                                handlePerRowsChange
                                            }
                                            onChangePage={handlePageChange}
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
                toggle={handleDeleteClose}
                setmodal_delete={setmodal_delete}
                disabled={isDeleteLoading}
            />
        </React.Fragment>
    );
};

export default Patients;
