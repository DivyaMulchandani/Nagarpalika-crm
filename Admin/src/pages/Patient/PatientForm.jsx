import React, { useState, useEffect, useContext, useCallback } from "react";
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
    Alert,
} from "reactstrap";
import Select from "react-select";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { toast } from "react-toastify";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { AuthContext } from "../../context/AuthContext";
import {
    createPatient,
    quickCreatePatient,
    updatePatient,
    getPatientById,
    duplicateCheck,
} from "../../api/patients.api";
import { getMasterData } from "../../api/masterData.api";
import {
    getAllCountries,
    getStatesByCountry,
    getCitiesByState,
} from "../../api/locations.api";
import { getAllDoctors } from "../../api/doctors.api";

const CATEGORIES = [
    "TITLE",
    "GENDER",
    "BLOOD_GROUP",
    "MARITAL_STATUS",
    "OCCUPATION_TYPE",
    "ID_PROOF_TYPE",
    "REFERRAL_SOURCE",
    "RELATIONSHIP_TYPE",
    "ALLERGY_TYPE",
];

const initialState = {
    titleId: "",
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    genderId: "",
    bloodGroupId: "",
    maritalStatusId: "",
    occupationId: "",
    mobileNumber: "",
    alternateMobile: "",
    email: "",
    address: {
        line1: "",
        line2: "",
        countryId: "",
        stateId: "",
        cityId: "",
        pincode: "",
    },
    idProofTypeId: "",
    idProofNumber: "",
    allergies: [],
    medicalHistory: "",
    currentMedications: "",
    weddingAnniversary: "",
    emergencyContact: {
        name: "",
        relationshipId: "",
        phone: "",
    },
    referralSourceId: "",
    referredByPatient: "",
    referredByDoctor: "",
    notes: "",
    isActive: true,
};

const toOption = (item, labelKey = "label") =>
    item ? { value: item._id, label: item[labelKey] } : null;

const PatientForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const { adminData } = useContext(AuthContext);

    const isEdit = Boolean(id);
    const isQuick = searchParams.get("mode") === "quick" && !isEdit;

    const [values, setValues] = useState(initialState);
    const [formErrors, setFormErrors] = useState({});
    const [isSubmit, setIsSubmit] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [masters, setMasters] = useState({});
    const [countryList, setCountryList] = useState([]);
    const [stateList, setStateList] = useState([]);
    const [cityList, setCityList] = useState([]);
    const [doctorList, setDoctorList] = useState([]);

    const [duplicates, setDuplicates] = useState([]);
    const [duplicateAck, setDuplicateAck] = useState(false);

    const fetchMasters = useCallback(async () => {
        try {
            const results = await Promise.all(
                CATEGORIES.map((c) =>
                    getMasterData({ category: c, isActive: true }),
                ),
            );
            const map = {};
            CATEGORIES.forEach((c, idx) => {
                map[c] = results[idx]?.data?.data || [];
            });
            setMasters(map);
        } catch (err) {
            console.error("Error fetching masters:", err);
        }
    }, []);

    const fetchCountries = useCallback(async () => {
        try {
            const res = await getAllCountries();
            if (res.data.isOk) setCountryList(res.data.data);
        } catch (err) {
            console.error("Error fetching countries:", err);
        }
    }, []);

    const fetchStates = useCallback(async (countryId) => {
        if (!countryId) {
            setStateList([]);
            return;
        }
        try {
            const res = await getStatesByCountry(countryId);
            if (res.data.isOk) setStateList(res.data.data);
        } catch (err) {
            console.error("Error fetching states:", err);
        }
    }, []);

    const fetchCities = useCallback(async (stateId) => {
        if (!stateId) {
            setCityList([]);
            return;
        }
        try {
            const res = await getCitiesByState(stateId);
            if (res.data.isOk) setCityList(res.data.data);
        } catch (err) {
            console.error("Error fetching cities:", err);
        }
    }, []);

    const fetchDoctors = useCallback(async () => {
        try {
            const res = await getAllDoctors();
            if (res.data.isOk) setDoctorList(res.data.data || []);
        } catch (err) {
            console.error("Error fetching doctors:", err);
        }
    }, []);

    useEffect(() => {
        fetchMasters();
        if (!isQuick) {
            fetchCountries();
            fetchDoctors();
        }
    }, [fetchMasters, fetchCountries, fetchDoctors, isQuick]);

    useEffect(() => {
        if (!isEdit) return;
        setIsLoading(true);
        getPatientById(id)
            .then((res) => {
                if (!res.data.isOk) return;
                const d = res.data.data;
                const refId = (v) => v?._id || v || "";
                setValues({
                    titleId: refId(d.titleId),
                    firstName: d.firstName || "",
                    lastName: d.lastName || "",
                    dateOfBirth: d.dateOfBirth
                        ? new Date(d.dateOfBirth).toISOString().slice(0, 10)
                        : "",
                    genderId: refId(d.genderId),
                    bloodGroupId: refId(d.bloodGroupId),
                    maritalStatusId: refId(d.maritalStatusId),
                    occupationId: refId(d.occupationId),
                    mobileNumber: d.mobileNumber || "",
                    alternateMobile: d.alternateMobile || "",
                    email: d.email || "",
                    address: {
                        line1: d.address?.line1 || "",
                        line2: d.address?.line2 || "",
                        countryId: refId(d.address?.countryId),
                        stateId: refId(d.address?.stateId),
                        cityId: refId(d.address?.cityId),
                        pincode: d.address?.pincode || "",
                    },
                    idProofTypeId: refId(d.idProofTypeId),
                    idProofNumber: d.idProofNumber || "",
                    allergies: (d.allergies || []).map((a) => ({
                        allergyTypeId: refId(a.allergyTypeId),
                        notes: a.notes || "",
                    })),
                    medicalHistory: d.medicalHistory || "",
                    currentMedications: d.currentMedications || "",
                    weddingAnniversary: d.weddingAnniversary
                        ? new Date(d.weddingAnniversary)
                              .toISOString()
                              .slice(0, 10)
                        : "",
                    emergencyContact: {
                        name: d.emergencyContact?.name || "",
                        relationshipId: refId(
                            d.emergencyContact?.relationshipId,
                        ),
                        phone: d.emergencyContact?.phone || "",
                    },
                    referralSourceId: refId(d.referralSourceId),
                    referredByPatient: refId(d.referredByPatient),
                    referredByDoctor: refId(d.referredByDoctor),
                    notes: d.notes || "",
                    isActive: d.isActive !== false,
                });
                if (d.address?.countryId) {
                    fetchStates(refId(d.address.countryId)).then(() => {
                        if (d.address?.stateId) {
                            fetchCities(refId(d.address.stateId));
                        }
                    });
                }
            })
            .catch((err) => {
                console.error(err);
                toast.error("Failed to load patient");
            })
            .finally(() => setIsLoading(false));
    }, [id, isEdit, fetchStates, fetchCities]);

    const handleField = (name, value) => {
        setValues((prev) => ({ ...prev, [name]: value }));
    };

    const handleAddressField = (name, value) => {
        setValues((prev) => ({
            ...prev,
            address: { ...prev.address, [name]: value },
        }));
    };

    const handleEmergencyField = (name, value) => {
        setValues((prev) => ({
            ...prev,
            emergencyContact: { ...prev.emergencyContact, [name]: value },
        }));
    };

    const addAllergy = () => {
        setValues((prev) => ({
            ...prev,
            allergies: [
                ...prev.allergies,
                { allergyTypeId: "", notes: "" },
            ],
        }));
    };

    const updateAllergy = (idx, name, val) => {
        setValues((prev) => {
            const next = [...prev.allergies];
            next[idx] = { ...next[idx], [name]: val };
            return { ...prev, allergies: next };
        });
    };

    const removeAllergy = (idx) => {
        setValues((prev) => ({
            ...prev,
            allergies: prev.allergies.filter((_, i) => i !== idx),
        }));
    };

    const handleCountryChange = (option) => {
        handleAddressField("countryId", option ? option.value : "");
        handleAddressField("stateId", "");
        handleAddressField("cityId", "");
        setStateList([]);
        setCityList([]);
        if (option) fetchStates(option.value);
    };

    const handleStateChange = (option) => {
        handleAddressField("stateId", option ? option.value : "");
        handleAddressField("cityId", "");
        setCityList([]);
        if (option) fetchCities(option.value);
    };

    const handleMobileBlur = async () => {
        if (!values.mobileNumber || isEdit) return;
        try {
            const res = await duplicateCheck({
                mobile: values.mobileNumber,
                firstName: values.firstName || undefined,
                lastName: values.lastName || undefined,
            });
            const list = res.data?.data || [];
            setDuplicates(list);
            if (list.length === 0) setDuplicateAck(false);
        } catch (err) {
            console.error("Duplicate check failed:", err);
        }
    };

    const validate = () => {
        const errors = {};
        if (!values.firstName.trim())
            errors.firstName = "First name is required";
        if (!values.mobileNumber.trim())
            errors.mobileNumber = "Mobile number is required";
        else if (!/^[+\d\s\-()]+$/.test(values.mobileNumber))
            errors.mobileNumber = "Invalid mobile number";
        if (!values.genderId) errors.genderId = "Gender is required";
        if (
            values.email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)
        )
            errors.email = "Invalid email";
        if (
            values.alternateMobile &&
            !/^[+\d\s\-()]+$/.test(values.alternateMobile)
        )
            errors.alternateMobile = "Invalid alternate mobile";
        return errors;
    };

    const buildPayload = () => {
        if (isQuick) {
            return {
                firstName: values.firstName,
                mobileNumber: values.mobileNumber,
                genderId: values.genderId,
            };
        }
        const payload = { ...values };
        if (!payload.dateOfBirth) delete payload.dateOfBirth;
        if (!payload.weddingAnniversary) delete payload.weddingAnniversary;
        Object.keys(payload).forEach((k) => {
            if (payload[k] === "") delete payload[k];
        });
        if (payload.address) {
            Object.keys(payload.address).forEach((k) => {
                if (payload.address[k] === "") delete payload.address[k];
            });
        }
        if (payload.emergencyContact) {
            Object.keys(payload.emergencyContact).forEach((k) => {
                if (payload.emergencyContact[k] === "")
                    delete payload.emergencyContact[k];
            });
        }
        if (Array.isArray(payload.allergies)) {
            payload.allergies = payload.allergies.filter(
                (a) => a.allergyTypeId || a.notes,
            );
        }
        return payload;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const errors = validate();
        setFormErrors(errors);
        setIsSubmit(true);
        if (Object.keys(errors).length > 0) return;

        if (!isEdit && duplicates.length > 0 && !duplicateAck) {
            toast.warning(
                "Possible duplicates found. Confirm and submit again.",
            );
            setDuplicateAck(true);
            return;
        }

        const payload = buildPayload();
        setIsLoading(true);

        const promise = isEdit
            ? updatePatient(id, payload)
            : isQuick
              ? quickCreatePatient(payload)
              : createPatient(payload);

        promise
            .then((res) => {
                if (!res.data.isOk) {
                    toast.error(res.data.message || "Failed to save patient");
                    return;
                }
                toast.success(
                    isEdit
                        ? "Patient updated successfully"
                        : "Patient created successfully",
                );
                const newId = res.data?.data?._id || id;
                if (newId) navigate(`/patient/${newId}`);
                else navigate("/patients");
            })
            .catch((err) => {
                console.error(err);
                toast.error(
                    err?.response?.data?.message ||
                        "Failed to save patient",
                );
            })
            .finally(() => setIsLoading(false));
    };

    const masterOptions = (cat) =>
        (masters[cat] || []).map((m) => toOption(m));

    const findOption = (cat, valueId) =>
        masterOptions(cat).find((o) => o.value === valueId) || null;

    const countryOptions = countryList.map((c) => ({
        value: c._id,
        label: c.countryName,
    }));
    const stateOptions = stateList.map((s) => ({
        value: s._id,
        label: s.stateName,
    }));
    const cityOptions = cityList.map((c) => ({
        value: c._id,
        label: c.cityName,
    }));
    const doctorOptions = doctorList.map((d) => ({
        value: d._id,
        label: d.doctorName,
    }));

    document.title = `${isEdit ? "Edit" : "Add"} Patient | ${
        adminData?.companyName || ""
    }`;

    const renderRequiredCore = () => (
        <Row>
            <Col md={4}>
                <div className="mb-3">
                    <Label>
                        First Name <span className="text-danger">*</span>
                    </Label>
                    <Input
                        type="text"
                        value={values.firstName}
                        onChange={(e) =>
                            handleField("firstName", e.target.value)
                        }
                    />
                    {isSubmit && formErrors.firstName && (
                        <p className="text-danger mb-0">
                            {formErrors.firstName}
                        </p>
                    )}
                </div>
            </Col>
            <Col md={4}>
                <div className="mb-3">
                    <Label>
                        Mobile Number <span className="text-danger">*</span>
                    </Label>
                    <Input
                        type="text"
                        value={values.mobileNumber}
                        onChange={(e) =>
                            handleField("mobileNumber", e.target.value)
                        }
                        onBlur={handleMobileBlur}
                    />
                    {isSubmit && formErrors.mobileNumber && (
                        <p className="text-danger mb-0">
                            {formErrors.mobileNumber}
                        </p>
                    )}
                </div>
            </Col>
            <Col md={4}>
                <div className="mb-3">
                    <Label>
                        Gender <span className="text-danger">*</span>
                    </Label>
                    <Select
                        options={masterOptions("GENDER")}
                        value={findOption("GENDER", values.genderId)}
                        onChange={(opt) =>
                            handleField("genderId", opt ? opt.value : "")
                        }
                        isClearable
                        placeholder="Select gender"
                    />
                    {isSubmit && formErrors.genderId && (
                        <p className="text-danger mb-0">
                            {formErrors.genderId}
                        </p>
                    )}
                </div>
            </Col>
        </Row>
    );

    if (isQuick) {
        return (
            <React.Fragment>
                <div className="page-content">
                    <Container fluid>
                        <BreadCrumb
                            maintitle="Patients"
                            title="Quick Add"
                            pageTitle="Patients"
                        />
                        <form onSubmit={handleSubmit}>
                            <Card>
                                <CardHeader>
                                    <h4 className="mb-0">
                                        Quick Add Patient
                                    </h4>
                                    <small className="text-muted">
                                        Status will be set to{" "}
                                        <code>partial</code>. Complete intake
                                        later via Edit.
                                    </small>
                                </CardHeader>
                                <CardBody>
                                    {duplicates.length > 0 && (
                                        <Alert color="warning">
                                            <strong>
                                                Possible duplicates:
                                            </strong>
                                            <ul className="mb-0">
                                                {duplicates.map((d) => (
                                                    <li key={d._id}>
                                                        <Link
                                                            to={`/patient/${d._id}`}
                                                        >
                                                            {d.patientId} —{" "}
                                                            {d.firstName}{" "}
                                                            {d.lastName} (
                                                            {d.mobileNumber})
                                                        </Link>
                                                    </li>
                                                ))}
                                            </ul>
                                            <small>
                                                Click submit again to ignore
                                                and create new.
                                            </small>
                                        </Alert>
                                    )}
                                    {renderRequiredCore()}
                                </CardBody>
                            </Card>
                            <div className="d-flex justify-content-end gap-2 mt-3">
                                <Button
                                    type="button"
                                    color="outline-danger"
                                    onClick={() => navigate("/patients")}
                                    disabled={isLoading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    color="success"
                                    disabled={isLoading}
                                >
                                    {isLoading ? "Saving..." : "Save"}
                                </Button>
                            </div>
                        </form>
                    </Container>
                </div>
            </React.Fragment>
        );
    }

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb
                        maintitle="Patients"
                        title={isEdit ? "Edit Patient" : "Add Patient"}
                        pageTitle="Patients"
                    />
                    <form onSubmit={handleSubmit}>
                        {duplicates.length > 0 && !isEdit && (
                            <Alert color="warning">
                                <strong>Possible duplicates:</strong>
                                <ul className="mb-0">
                                    {duplicates.map((d) => (
                                        <li key={d._id}>
                                            <Link to={`/patient/${d._id}`}>
                                                {d.patientId} — {d.firstName}{" "}
                                                {d.lastName} ({d.mobileNumber})
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                                <small>
                                    Click Save again to ignore and create new.
                                </small>
                            </Alert>
                        )}

                        <Card>
                            <CardHeader>
                                <h5 className="mb-0">Basic</h5>
                            </CardHeader>
                            <CardBody>
                                <Row>
                                    <Col md={3}>
                                        <div className="mb-3">
                                            <Label>Title</Label>
                                            <Select
                                                options={masterOptions("TITLE")}
                                                value={findOption(
                                                    "TITLE",
                                                    values.titleId,
                                                )}
                                                onChange={(opt) =>
                                                    handleField(
                                                        "titleId",
                                                        opt ? opt.value : "",
                                                    )
                                                }
                                                isClearable
                                            />
                                        </div>
                                    </Col>
                                    <Col md={3}>
                                        <div className="mb-3">
                                            <Label>
                                                First Name{" "}
                                                <span className="text-danger">
                                                    *
                                                </span>
                                            </Label>
                                            <Input
                                                type="text"
                                                value={values.firstName}
                                                onChange={(e) =>
                                                    handleField(
                                                        "firstName",
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                            {isSubmit && formErrors.firstName && (
                                                <p className="text-danger mb-0">
                                                    {formErrors.firstName}
                                                </p>
                                            )}
                                        </div>
                                    </Col>
                                    <Col md={3}>
                                        <div className="mb-3">
                                            <Label>Last Name</Label>
                                            <Input
                                                type="text"
                                                value={values.lastName}
                                                onChange={(e) =>
                                                    handleField(
                                                        "lastName",
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </div>
                                    </Col>
                                    <Col md={3}>
                                        <div className="mb-3">
                                            <Label>Date of Birth</Label>
                                            <Input
                                                type="date"
                                                value={values.dateOfBirth}
                                                onChange={(e) =>
                                                    handleField(
                                                        "dateOfBirth",
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </div>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col md={3}>
                                        <div className="mb-3">
                                            <Label>
                                                Gender{" "}
                                                <span className="text-danger">
                                                    *
                                                </span>
                                            </Label>
                                            <Select
                                                options={masterOptions(
                                                    "GENDER",
                                                )}
                                                value={findOption(
                                                    "GENDER",
                                                    values.genderId,
                                                )}
                                                onChange={(opt) =>
                                                    handleField(
                                                        "genderId",
                                                        opt ? opt.value : "",
                                                    )
                                                }
                                                isClearable
                                            />
                                            {isSubmit && formErrors.genderId && (
                                                <p className="text-danger mb-0">
                                                    {formErrors.genderId}
                                                </p>
                                            )}
                                        </div>
                                    </Col>
                                    <Col md={3}>
                                        <div className="mb-3">
                                            <Label>Blood Group</Label>
                                            <Select
                                                options={masterOptions(
                                                    "BLOOD_GROUP",
                                                )}
                                                value={findOption(
                                                    "BLOOD_GROUP",
                                                    values.bloodGroupId,
                                                )}
                                                onChange={(opt) =>
                                                    handleField(
                                                        "bloodGroupId",
                                                        opt ? opt.value : "",
                                                    )
                                                }
                                                isClearable
                                            />
                                        </div>
                                    </Col>
                                    <Col md={3}>
                                        <div className="mb-3">
                                            <Label>Marital Status</Label>
                                            <Select
                                                options={masterOptions(
                                                    "MARITAL_STATUS",
                                                )}
                                                value={findOption(
                                                    "MARITAL_STATUS",
                                                    values.maritalStatusId,
                                                )}
                                                onChange={(opt) =>
                                                    handleField(
                                                        "maritalStatusId",
                                                        opt ? opt.value : "",
                                                    )
                                                }
                                                isClearable
                                            />
                                        </div>
                                    </Col>
                                    <Col md={3}>
                                        <div className="mb-3">
                                            <Label>Occupation</Label>
                                            <Select
                                                options={masterOptions(
                                                    "OCCUPATION_TYPE",
                                                )}
                                                value={findOption(
                                                    "OCCUPATION_TYPE",
                                                    values.occupationId,
                                                )}
                                                onChange={(opt) =>
                                                    handleField(
                                                        "occupationId",
                                                        opt ? opt.value : "",
                                                    )
                                                }
                                                isClearable
                                            />
                                        </div>
                                    </Col>
                                </Row>
                            </CardBody>
                        </Card>

                        <Card>
                            <CardHeader>
                                <h5 className="mb-0">Contact</h5>
                            </CardHeader>
                            <CardBody>
                                <Row>
                                    <Col md={4}>
                                        <div className="mb-3">
                                            <Label>
                                                Mobile Number{" "}
                                                <span className="text-danger">
                                                    *
                                                </span>
                                            </Label>
                                            <Input
                                                type="text"
                                                value={values.mobileNumber}
                                                onChange={(e) =>
                                                    handleField(
                                                        "mobileNumber",
                                                        e.target.value,
                                                    )
                                                }
                                                onBlur={handleMobileBlur}
                                            />
                                            {isSubmit && formErrors.mobileNumber && (
                                                <p className="text-danger mb-0">
                                                    {formErrors.mobileNumber}
                                                </p>
                                            )}
                                        </div>
                                    </Col>
                                    <Col md={4}>
                                        <div className="mb-3">
                                            <Label>Alternate Mobile</Label>
                                            <Input
                                                type="text"
                                                value={values.alternateMobile}
                                                onChange={(e) =>
                                                    handleField(
                                                        "alternateMobile",
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                            {isSubmit &&
                                                formErrors.alternateMobile && (
                                                    <p className="text-danger mb-0">
                                                        {
                                                            formErrors.alternateMobile
                                                        }
                                                    </p>
                                                )}
                                        </div>
                                    </Col>
                                    <Col md={4}>
                                        <div className="mb-3">
                                            <Label>Email</Label>
                                            <Input
                                                type="email"
                                                value={values.email}
                                                onChange={(e) =>
                                                    handleField(
                                                        "email",
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                            {isSubmit && formErrors.email && (
                                                <p className="text-danger mb-0">
                                                    {formErrors.email}
                                                </p>
                                            )}
                                        </div>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col md={6}>
                                        <div className="mb-3">
                                            <Label>Address Line 1</Label>
                                            <Input
                                                type="text"
                                                value={values.address.line1}
                                                onChange={(e) =>
                                                    handleAddressField(
                                                        "line1",
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </div>
                                    </Col>
                                    <Col md={6}>
                                        <div className="mb-3">
                                            <Label>Address Line 2</Label>
                                            <Input
                                                type="text"
                                                value={values.address.line2}
                                                onChange={(e) =>
                                                    handleAddressField(
                                                        "line2",
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </div>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col md={3}>
                                        <div className="mb-3">
                                            <Label>Country</Label>
                                            <Select
                                                options={countryOptions}
                                                value={
                                                    countryOptions.find(
                                                        (o) =>
                                                            o.value ===
                                                            values.address
                                                                .countryId,
                                                    ) || null
                                                }
                                                onChange={handleCountryChange}
                                                isClearable
                                            />
                                        </div>
                                    </Col>
                                    <Col md={3}>
                                        <div className="mb-3">
                                            <Label>State</Label>
                                            <Select
                                                options={stateOptions}
                                                value={
                                                    stateOptions.find(
                                                        (o) =>
                                                            o.value ===
                                                            values.address
                                                                .stateId,
                                                    ) || null
                                                }
                                                onChange={handleStateChange}
                                                isClearable
                                                isDisabled={
                                                    !values.address.countryId
                                                }
                                            />
                                        </div>
                                    </Col>
                                    <Col md={3}>
                                        <div className="mb-3">
                                            <Label>City</Label>
                                            <Select
                                                options={cityOptions}
                                                value={
                                                    cityOptions.find(
                                                        (o) =>
                                                            o.value ===
                                                            values.address
                                                                .cityId,
                                                    ) || null
                                                }
                                                onChange={(opt) =>
                                                    handleAddressField(
                                                        "cityId",
                                                        opt ? opt.value : "",
                                                    )
                                                }
                                                isClearable
                                                isDisabled={
                                                    !values.address.stateId
                                                }
                                            />
                                        </div>
                                    </Col>
                                    <Col md={3}>
                                        <div className="mb-3">
                                            <Label>Pincode</Label>
                                            <Input
                                                type="text"
                                                value={values.address.pincode}
                                                onChange={(e) =>
                                                    handleAddressField(
                                                        "pincode",
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </div>
                                    </Col>
                                </Row>
                            </CardBody>
                        </Card>

                        <Card>
                            <CardHeader>
                                <h5 className="mb-0">Identity</h5>
                            </CardHeader>
                            <CardBody>
                                <Row>
                                    <Col md={6}>
                                        <div className="mb-3">
                                            <Label>ID Proof Type</Label>
                                            <Select
                                                options={masterOptions(
                                                    "ID_PROOF_TYPE",
                                                )}
                                                value={findOption(
                                                    "ID_PROOF_TYPE",
                                                    values.idProofTypeId,
                                                )}
                                                onChange={(opt) =>
                                                    handleField(
                                                        "idProofTypeId",
                                                        opt ? opt.value : "",
                                                    )
                                                }
                                                isClearable
                                            />
                                        </div>
                                    </Col>
                                    <Col md={6}>
                                        <div className="mb-3">
                                            <Label>ID Proof Number</Label>
                                            <Input
                                                type="text"
                                                value={values.idProofNumber}
                                                onChange={(e) =>
                                                    handleField(
                                                        "idProofNumber",
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </div>
                                    </Col>
                                </Row>
                            </CardBody>
                        </Card>

                        <Card>
                            <CardHeader className="d-flex justify-content-between align-items-center">
                                <h5 className="mb-0">Medical</h5>
                                <Button
                                    type="button"
                                    size="sm"
                                    color="primary"
                                    outline
                                    onClick={addAllergy}
                                >
                                    <i className="ri-add-line"></i> Add Allergy
                                </Button>
                            </CardHeader>
                            <CardBody>
                                {values.allergies.length === 0 && (
                                    <p className="text-muted mb-3">
                                        No allergies added.
                                    </p>
                                )}
                                {values.allergies.map((a, idx) => (
                                    <Row key={idx} className="mb-2">
                                        <Col md={4}>
                                            <Select
                                                options={masterOptions(
                                                    "ALLERGY_TYPE",
                                                )}
                                                value={findOption(
                                                    "ALLERGY_TYPE",
                                                    a.allergyTypeId,
                                                )}
                                                onChange={(opt) =>
                                                    updateAllergy(
                                                        idx,
                                                        "allergyTypeId",
                                                        opt ? opt.value : "",
                                                    )
                                                }
                                                isClearable
                                                placeholder="Allergy type"
                                            />
                                        </Col>
                                        <Col md={7}>
                                            <Input
                                                type="text"
                                                value={a.notes}
                                                placeholder="Notes"
                                                onChange={(e) =>
                                                    updateAllergy(
                                                        idx,
                                                        "notes",
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </Col>
                                        <Col md={1}>
                                            <Button
                                                type="button"
                                                color="danger"
                                                outline
                                                onClick={() =>
                                                    removeAllergy(idx)
                                                }
                                            >
                                                <i className="ri-delete-bin-line"></i>
                                            </Button>
                                        </Col>
                                    </Row>
                                ))}
                                <Row className="mt-3">
                                    <Col md={6}>
                                        <div className="mb-3">
                                            <Label>Medical History</Label>
                                            <Input
                                                type="textarea"
                                                rows="3"
                                                value={values.medicalHistory}
                                                onChange={(e) =>
                                                    handleField(
                                                        "medicalHistory",
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </div>
                                    </Col>
                                    <Col md={6}>
                                        <div className="mb-3">
                                            <Label>Current Medications</Label>
                                            <Input
                                                type="textarea"
                                                rows="3"
                                                value={
                                                    values.currentMedications
                                                }
                                                onChange={(e) =>
                                                    handleField(
                                                        "currentMedications",
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </div>
                                    </Col>
                                </Row>
                            </CardBody>
                        </Card>

                        <Card>
                            <CardHeader>
                                <h5 className="mb-0">Personal</h5>
                            </CardHeader>
                            <CardBody>
                                <Row>
                                    <Col md={4}>
                                        <div className="mb-3">
                                            <Label>Wedding Anniversary</Label>
                                            <Input
                                                type="date"
                                                value={values.weddingAnniversary}
                                                onChange={(e) =>
                                                    handleField(
                                                        "weddingAnniversary",
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </div>
                                    </Col>
                                </Row>
                            </CardBody>
                        </Card>

                        <Card>
                            <CardHeader>
                                <h5 className="mb-0">Emergency Contact</h5>
                            </CardHeader>
                            <CardBody>
                                <Row>
                                    <Col md={4}>
                                        <div className="mb-3">
                                            <Label>Name</Label>
                                            <Input
                                                type="text"
                                                value={
                                                    values.emergencyContact
                                                        .name
                                                }
                                                onChange={(e) =>
                                                    handleEmergencyField(
                                                        "name",
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </div>
                                    </Col>
                                    <Col md={4}>
                                        <div className="mb-3">
                                            <Label>Relationship</Label>
                                            <Select
                                                options={masterOptions(
                                                    "RELATIONSHIP_TYPE",
                                                )}
                                                value={findOption(
                                                    "RELATIONSHIP_TYPE",
                                                    values.emergencyContact
                                                        .relationshipId,
                                                )}
                                                onChange={(opt) =>
                                                    handleEmergencyField(
                                                        "relationshipId",
                                                        opt ? opt.value : "",
                                                    )
                                                }
                                                isClearable
                                            />
                                        </div>
                                    </Col>
                                    <Col md={4}>
                                        <div className="mb-3">
                                            <Label>Phone</Label>
                                            <Input
                                                type="text"
                                                value={
                                                    values.emergencyContact
                                                        .phone
                                                }
                                                onChange={(e) =>
                                                    handleEmergencyField(
                                                        "phone",
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </div>
                                    </Col>
                                </Row>
                            </CardBody>
                        </Card>

                        <Card>
                            <CardHeader>
                                <h5 className="mb-0">Referral</h5>
                            </CardHeader>
                            <CardBody>
                                <Row>
                                    <Col md={6}>
                                        <div className="mb-3">
                                            <Label>Referral Source</Label>
                                            <Select
                                                options={masterOptions(
                                                    "REFERRAL_SOURCE",
                                                )}
                                                value={findOption(
                                                    "REFERRAL_SOURCE",
                                                    values.referralSourceId,
                                                )}
                                                onChange={(opt) =>
                                                    handleField(
                                                        "referralSourceId",
                                                        opt ? opt.value : "",
                                                    )
                                                }
                                                isClearable
                                            />
                                        </div>
                                    </Col>
                                    <Col md={6}>
                                        <div className="mb-3">
                                            <Label>Referred By Doctor</Label>
                                            <Select
                                                options={doctorOptions}
                                                value={
                                                    doctorOptions.find(
                                                        (o) =>
                                                            o.value ===
                                                            values.referredByDoctor,
                                                    ) || null
                                                }
                                                onChange={(opt) =>
                                                    handleField(
                                                        "referredByDoctor",
                                                        opt ? opt.value : "",
                                                    )
                                                }
                                                isClearable
                                            />
                                        </div>
                                    </Col>
                                </Row>
                            </CardBody>
                        </Card>

                        <Card>
                            <CardHeader>
                                <h5 className="mb-0">Other</h5>
                            </CardHeader>
                            <CardBody>
                                <Row>
                                    <Col md={12}>
                                        <div className="mb-3">
                                            <Label>Notes</Label>
                                            <Input
                                                type="textarea"
                                                rows="3"
                                                value={values.notes}
                                                onChange={(e) =>
                                                    handleField(
                                                        "notes",
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </div>
                                    </Col>
                                </Row>
                                <div>
                                    <Input
                                        type="checkbox"
                                        className="form-check-input"
                                        checked={values.isActive}
                                        onChange={(e) =>
                                            handleField(
                                                "isActive",
                                                e.target.checked,
                                            )
                                        }
                                    />
                                    <Label className="form-check-label ms-2">
                                        Is Active
                                    </Label>
                                </div>
                            </CardBody>
                        </Card>

                        <div className="d-flex justify-content-end gap-2 mt-3 mb-5">
                            <Button
                                type="button"
                                color="outline-danger"
                                onClick={() => navigate("/patients")}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                color="success"
                                disabled={isLoading}
                            >
                                {isLoading
                                    ? isEdit
                                        ? "Updating..."
                                        : "Saving..."
                                    : isEdit
                                      ? "Update"
                                      : "Save"}
                            </Button>
                        </div>
                    </form>
                </Container>
            </div>
        </React.Fragment>
    );
};

export default PatientForm;
