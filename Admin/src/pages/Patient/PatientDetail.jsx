import React, { useState, useEffect, useContext } from "react";
import {
    Card,
    CardBody,
    CardHeader,
    Col,
    Container,
    Row,
    Nav,
    NavItem,
    NavLink,
    Button,
    Badge,
} from "reactstrap";
import classnames from "classnames";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import DeleteModal from "../../Components/Common/DeleteModal";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";
import {
    getPatientById,
    deletePatient,
} from "../../api/patients.api";
import DocumentsTab from "./components/DocumentsTab";
import AppointmentsTab from "./components/AppointmentsTab";
import PaymentsTab from "./components/PaymentsTab";

const TABS = [
    { id: "OVERVIEW", label: "Overview" },
    { id: "DOCUMENTS", label: "Documents" },
    { id: "APPOINTMENTS", label: "Appointments" },
    { id: "PAYMENTS", label: "Payments" },
];

const statusBadgeColor = (status) =>
    status === "active"
        ? "success"
        : status === "partial"
          ? "warning"
          : "secondary";

const labelOf = (v) => v?.label || "-";
const fullName = (p) =>
    `${p.titleId?.label ? p.titleId.label + " " : ""}${p.firstName || ""} ${
        p.lastName || ""
    }`.trim() || "-";
const formatDate = (d) => (d ? new Date(d).toLocaleDateString() : "-");

const InfoRow = ({ label, value }) => (
    <Row className="mb-2">
        <Col md={4} className="text-muted">
            {label}
        </Col>
        <Col md={8}>{value || "-"}</Col>
    </Row>
);

const PatientDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { adminData } = useContext(AuthContext);
    const { currentPagePermissions } = useContext(MenuContext);

    const [patient, setPatient] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("OVERVIEW");

    const [modal_delete, setmodal_delete] = useState(false);
    const [isDeleteLoading, setIsDeleteLoading] = useState(false);

    const fetchPatient = async () => {
        setIsLoading(true);
        try {
            const res = await getPatientById(id);
            if (res.data.isOk) setPatient(res.data.data);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load patient");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPatient();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const handleDelete = (e) => {
        e.preventDefault();
        setIsDeleteLoading(true);
        deletePatient(id)
            .then(() => {
                toast.success("Patient removed");
                setmodal_delete(false);
                navigate("/patients");
            })
            .catch((err) => {
                console.error(err);
                toast.error(
                    err?.response?.data?.message ||
                        "Failed to remove patient",
                );
            })
            .finally(() => setIsDeleteLoading(false));
    };

    document.title = `Patient | ${adminData?.companyName || ""}`;

    if (isLoading) {
        return (
            <div className="page-content">
                <Container fluid>
                    <p>Loading...</p>
                </Container>
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="page-content">
                <Container fluid>
                    <p>Patient not found.</p>
                </Container>
            </div>
        );
    }

    const addr = patient.address || {};
    const ec = patient.emergencyContact || {};

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb
                        maintitle="Patients"
                        title={fullName(patient)}
                        pageTitle="Patients"
                    />

                    <Card>
                        <CardBody>
                            <Row className="align-items-center">
                                <Col md={8}>
                                    <h4 className="mb-1">
                                        {fullName(patient)}{" "}
                                        <Badge
                                            color={statusBadgeColor(
                                                patient.status,
                                            )}
                                        >
                                            {patient.status}
                                        </Badge>
                                    </h4>
                                    <div className="text-muted">
                                        <strong>{patient.patientId}</strong>
                                        {" · "}
                                        Mobile: {patient.mobileNumber}
                                        {patient.age != null &&
                                            ` · Age: ${patient.age}`}
                                        {patient.genderId?.label &&
                                            ` · ${patient.genderId.label}`}
                                        {" · Registered "}
                                        {formatDate(patient.registrationDate)}
                                    </div>
                                </Col>
                                <Col md={4} className="text-end">
                                    {currentPagePermissions?.edit && (
                                        <Button
                                            color="success"
                                            className="me-2"
                                            onClick={() =>
                                                navigate(
                                                    `/patients/${id}/edit`,
                                                )
                                            }
                                        >
                                            Edit
                                        </Button>
                                    )}
                                    {currentPagePermissions?.delete && (
                                        <Button
                                            color="danger"
                                            outline
                                            onClick={() =>
                                                setmodal_delete(true)
                                            }
                                        >
                                            Remove
                                        </Button>
                                    )}
                                </Col>
                            </Row>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader>
                            <Nav tabs className="nav-tabs-custom">
                                {TABS.map((t) => (
                                    <NavItem key={t.id}>
                                        <NavLink
                                            href="#"
                                            className={classnames({
                                                active: activeTab === t.id,
                                            })}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setActiveTab(t.id);
                                            }}
                                        >
                                            {t.label}
                                        </NavLink>
                                    </NavItem>
                                ))}
                            </Nav>
                        </CardHeader>
                        <CardBody>
                            {activeTab === "OVERVIEW" && (
                                <Row>
                                    <Col md={6}>
                                        <Card>
                                            <CardHeader>
                                                <h6 className="mb-0">
                                                    Basic
                                                </h6>
                                            </CardHeader>
                                            <CardBody>
                                                <InfoRow
                                                    label="Title"
                                                    value={labelOf(
                                                        patient.titleId,
                                                    )}
                                                />
                                                <InfoRow
                                                    label="Date of Birth"
                                                    value={formatDate(
                                                        patient.dateOfBirth,
                                                    )}
                                                />
                                                <InfoRow
                                                    label="Age"
                                                    value={patient.age ?? "-"}
                                                />
                                                <InfoRow
                                                    label="Gender"
                                                    value={labelOf(
                                                        patient.genderId,
                                                    )}
                                                />
                                                <InfoRow
                                                    label="Blood Group"
                                                    value={labelOf(
                                                        patient.bloodGroupId,
                                                    )}
                                                />
                                                <InfoRow
                                                    label="Marital Status"
                                                    value={labelOf(
                                                        patient.maritalStatusId,
                                                    )}
                                                />
                                                <InfoRow
                                                    label="Occupation"
                                                    value={labelOf(
                                                        patient.occupationId,
                                                    )}
                                                />
                                            </CardBody>
                                        </Card>
                                    </Col>
                                    <Col md={6}>
                                        <Card>
                                            <CardHeader>
                                                <h6 className="mb-0">
                                                    Contact
                                                </h6>
                                            </CardHeader>
                                            <CardBody>
                                                <InfoRow
                                                    label="Mobile"
                                                    value={
                                                        patient.mobileNumber
                                                    }
                                                />
                                                <InfoRow
                                                    label="Alternate Mobile"
                                                    value={
                                                        patient.alternateMobile
                                                    }
                                                />
                                                <InfoRow
                                                    label="Email"
                                                    value={patient.email}
                                                />
                                                <InfoRow
                                                    label="Address"
                                                    value={[
                                                        addr.line1,
                                                        addr.line2,
                                                        addr.cityId?.cityName,
                                                        addr.stateId?.stateName,
                                                        addr.countryId
                                                            ?.countryName,
                                                        addr.pincode,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(", ")}
                                                />
                                            </CardBody>
                                        </Card>
                                    </Col>
                                    <Col md={6}>
                                        <Card>
                                            <CardHeader>
                                                <h6 className="mb-0">
                                                    Identity
                                                </h6>
                                            </CardHeader>
                                            <CardBody>
                                                <InfoRow
                                                    label="ID Proof Type"
                                                    value={labelOf(
                                                        patient.idProofTypeId,
                                                    )}
                                                />
                                                <InfoRow
                                                    label="ID Proof Number"
                                                    value={
                                                        patient.idProofNumber
                                                    }
                                                />
                                            </CardBody>
                                        </Card>
                                    </Col>
                                    <Col md={6}>
                                        <Card>
                                            <CardHeader>
                                                <h6 className="mb-0">
                                                    Medical
                                                </h6>
                                            </CardHeader>
                                            <CardBody>
                                                <InfoRow
                                                    label="Allergies"
                                                    value={
                                                        patient.allergies
                                                            ?.length > 0
                                                            ? patient.allergies
                                                                  .map(
                                                                      (a) =>
                                                                          `${labelOf(a.allergyTypeId)}${a.notes ? " (" + a.notes + ")" : ""}`,
                                                                  )
                                                                  .join(", ")
                                                            : "-"
                                                    }
                                                />
                                                <InfoRow
                                                    label="Medical History"
                                                    value={
                                                        patient.medicalHistory
                                                    }
                                                />
                                                <InfoRow
                                                    label="Current Medications"
                                                    value={
                                                        patient.currentMedications
                                                    }
                                                />
                                            </CardBody>
                                        </Card>
                                    </Col>
                                    <Col md={6}>
                                        <Card>
                                            <CardHeader>
                                                <h6 className="mb-0">
                                                    Emergency Contact
                                                </h6>
                                            </CardHeader>
                                            <CardBody>
                                                <InfoRow
                                                    label="Name"
                                                    value={ec.name}
                                                />
                                                <InfoRow
                                                    label="Relationship"
                                                    value={labelOf(
                                                        ec.relationshipId,
                                                    )}
                                                />
                                                <InfoRow
                                                    label="Phone"
                                                    value={ec.phone}
                                                />
                                            </CardBody>
                                        </Card>
                                    </Col>
                                    <Col md={6}>
                                        <Card>
                                            <CardHeader>
                                                <h6 className="mb-0">
                                                    Referral
                                                </h6>
                                            </CardHeader>
                                            <CardBody>
                                                <InfoRow
                                                    label="Source"
                                                    value={labelOf(
                                                        patient.referralSourceId,
                                                    )}
                                                />
                                                <InfoRow
                                                    label="Referred By Doctor"
                                                    value={
                                                        patient.referredByDoctor
                                                            ?.doctorName || "-"
                                                    }
                                                />
                                            </CardBody>
                                        </Card>
                                    </Col>
                                    <Col md={12}>
                                        <Card>
                                            <CardHeader>
                                                <h6 className="mb-0">
                                                    Audit
                                                </h6>
                                            </CardHeader>
                                            <CardBody>
                                                <Row>
                                                    <Col md={6}>
                                                        <InfoRow
                                                            label="Created By"
                                                            value={
                                                                patient
                                                                    .createdBy
                                                                    ?.employeeName ||
                                                                "-"
                                                            }
                                                        />
                                                        <InfoRow
                                                            label="Created At"
                                                            value={
                                                                patient.createdAt
                                                                    ? new Date(
                                                                          patient.createdAt,
                                                                      ).toLocaleString()
                                                                    : "-"
                                                            }
                                                        />
                                                    </Col>
                                                    <Col md={6}>
                                                        <InfoRow
                                                            label="Updated By"
                                                            value={
                                                                patient
                                                                    .updatedBy
                                                                    ?.employeeName ||
                                                                "-"
                                                            }
                                                        />
                                                        <InfoRow
                                                            label="Updated At"
                                                            value={
                                                                patient.updatedAt
                                                                    ? new Date(
                                                                          patient.updatedAt,
                                                                      ).toLocaleString()
                                                                    : "-"
                                                            }
                                                        />
                                                    </Col>
                                                </Row>
                                            </CardBody>
                                        </Card>
                                    </Col>
                                </Row>
                            )}

                            {activeTab === "DOCUMENTS" && (
                                <DocumentsTab patientId={id} />
                            )}

                            {activeTab === "APPOINTMENTS" && (
                                <AppointmentsTab patientId={id} />
                            )}

                            {activeTab === "PAYMENTS" && (
                                <PaymentsTab patientId={id} />
                            )}
                        </CardBody>
                    </Card>
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

export default PatientDetail;
