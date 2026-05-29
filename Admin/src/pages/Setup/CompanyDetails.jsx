/* eslint-disable default-case */
import React, { useContext, useEffect, useRef, useState, useCallback } from "react";
import {
  Card,
  CardBody,
  Col,
  Container,
  Form,
  Input,
  Row,
  Label,
  Spinner
} from "reactstrap";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { AuthContext } from "../../context/AuthContext";
import { toast } from "react-toastify";
import UiContent from "../../Components/Common/UiContent";
import { getAllCountries, getStatesByCountry, getCitiesByState } from "../../api/locations.api";
import { updateCompany } from "../../api/companies.api";

const API_URL = import.meta.env.VITE_API_URL || ""
const toAbsUrl = (p) => {
  if (!p || p.startsWith("blob:") || p.startsWith("http")) return p
  return `${API_URL}/${p.replace(/\\/g, "/")}`
}

const CompanyDetails = () => {
  const { adminData, getAdmin } = useContext(AuthContext);

  const [formErrors, setFormErrors] = useState({});
  const [isSubmit, setIsSubmit] = useState(false);
  const imageRef = useRef(null);

  const initialState = {
    companyName: adminData.companyName || "",
    email: adminData.email || "",
    mobileNumber: adminData.mobileNumber || "",
    gstNumber: adminData.gstNumber || "",
    countryId: adminData.countryId && typeof adminData.countryId === 'object' ? adminData.countryId._id : adminData.countryId || "",
    stateId: adminData.stateId && typeof adminData.stateId === 'object' ? adminData.stateId._id : adminData.stateId || "",
    cityId: adminData.cityId && typeof adminData.cityId === 'object' ? adminData.cityId._id : adminData.cityId || "",
    address: adminData.address || "",
    pincode: adminData.pincode || "",
    logo: adminData.logo || "",
    favicon: adminData.favicon || "",
    website: adminData.website || "",
  };

  const [values, setValues] = useState(initialState);
  const [countryList, setCountryList] = useState([]);
  const [stateList, setStateList] = useState([]);
  const [cityList, setCityList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStatesLoading, setIsStatesLoading] = useState(false);
  const [isCitiesLoading, setIsCitiesLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [showFileInput, setShowFileInput] = useState(true);

  // favicon file upload states
  const [faviconFile, setFaviconFile] = useState(null);
  const [faviconPreview, setFaviconPreview] = useState("");
  const [showFaviconInput, setShowFaviconInput] = useState(true);
  const faviconRef = useRef(null);

  // Fetch countries on component mount
  const fetchCountries = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await getAllCountries();
      if (response.data.isOk) {
        setCountryList(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching countries:", error);
      toast.error("Failed to load countries");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch states by country
  const fetchStatesByCountry = useCallback(async (countryId) => {
    try {
      setIsStatesLoading(true);
      setStateList([]);
      setCityList([]);
      const response = await getStatesByCountry(countryId);
      if (response.data.isOk) {
        setStateList(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching states:", error);
      toast.error("Failed to load states");
    } finally {
      setIsStatesLoading(false);
    }
  }, []);

  // Fetch cities by state
  const fetchCitiesByState = useCallback(async (stateId) => {
    try {
      setIsCitiesLoading(true);
      setCityList([]);
      const response = await getCitiesByState(stateId);
      if (response.data.isOk) {
        setCityList(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching cities:", error);
      toast.error("Failed to load cities");
    } finally {
      setIsCitiesLoading(false);
    }
  }, []);

  // Load initial data for existing records
  useEffect(() => {
    const loadInitialData = async () => {
      if (adminData && adminData.countryId) {
        const countryId = adminData.countryId._id || adminData.countryId;
        await fetchStatesByCountry(countryId);

        if (adminData.stateId) {
          const stateId = adminData.stateId._id || adminData.stateId;
          await fetchCitiesByState(stateId);
        }
      }
    };

    // Only load if we have fetched countries first
    if (countryList.length > 0) {
      loadInitialData();
    }
  }, [adminData, countryList, fetchStatesByCountry, fetchCitiesByState]);

  useEffect(() => {
    if (adminData) {
      // Update values when adminData changes
      setValues({
        companyName: adminData.companyName || "",
        email: adminData.email || "",
        mobileNumber: adminData.mobileNumber || "",
        gstNumber: adminData.gstNumber || "",
        countryId: adminData.countryId && typeof adminData.countryId === 'object' ? adminData.countryId._id : adminData.countryId || "",
        stateId: adminData.stateId && typeof adminData.stateId === 'object' ? adminData.stateId._id : adminData.stateId || "",
        cityId: adminData.cityId && typeof adminData.cityId === 'object' ? adminData.cityId._id : adminData.cityId || "",
        address: adminData.address || "",
        pincode: adminData.pincode || "",
        logo: adminData.logo || "",
        favicon: adminData.favicon || "",
        website: adminData.website || "",
      });

      fetchCountries();
    }
  }, [adminData, fetchCountries]);

  useEffect(() => {
    if (adminData.logo) {
      setLogoPreview(toAbsUrl(adminData.logo));
      setShowFileInput(false);
    }
  }, [adminData.logo]);

  useEffect(() => {
    if (adminData.favicon) {
      setFaviconPreview(toAbsUrl(adminData.favicon));
      setShowFaviconInput(false);
    }
  }, [adminData.favicon]);

  // Validate every field and specific validations for mobile and pincode
  const validate = (values) => {
    let errors = {};
    if (!values.companyName.trim()) {
      errors.companyName = "Company name is required";
    }
    if (!values.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email)) {
      errors.email = "Invalid email address";
    }
    if (!values.mobileNumber.trim()) {
      errors.mobileNumber = "Mobile number is required";
    } else if (values.mobileNumber.length !== 10) {
      errors.mobileNumber = "Mobile number must be 10 digits";
    }
    if (!values.gstNumber.trim()) {
      errors.gstNumber = "GST number is required";
    }
    if (!values.countryId) {
      errors.countryId = "Country is required";
    }
    if (!values.stateId) {
      errors.stateId = "State is required";
    }
    if (!values.cityId) {
      errors.cityId = "City is required";
    }
    if (!values.address.trim()) {
      errors.address = "Address is required";
    }
    if (!values.pincode.trim()) {
      errors.pincode = "Pincode is required";
    } else if (values.pincode.length !== 6) {
      errors.pincode = "Pincode must be 6 digits";
    }
    if (!values.website.trim()) {
      errors.website = "Website is required";
    }
    return errors;
  };

  const hasChanges = () => {
    const currentValues = { ...values };
    const originalValues = { ...adminData };
    return JSON.stringify(currentValues) !== JSON.stringify(originalValues) || selectedFile !== null || faviconFile !== null;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setLogoPreview(URL.createObjectURL(file));
      setShowFileInput(false); // Hide file input after selection
    }
  };

  // favicon file handling functions
  const handleFaviconChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      // Check file size (1MB = 1 * 1024 * 1024 bytes)
      if (file.size > 1 * 1024 * 1024) {
        toast.error("File size should not exceed 1MB");
        e.target.value = "";
        return;
      }

      // Check if it's an image file
      if (!file.type.startsWith('image/')) {
        toast.error("Only image files are allowed for favicon");
        e.target.value = "";
        return;
      }

      setFaviconFile(file);
      setFaviconPreview(URL.createObjectURL(file));
      setShowFaviconInput(false); // Hide file input after selection
    }
  };

  const resetFaviconStates = () => {
    setFaviconFile(null);
    setFaviconPreview("");
    setShowFaviconInput(true);
    if (faviconRef.current) {
      faviconRef.current.value = ""; // Clears the file input
    }
  };

  const handleRemoveFavicon = () => {
    setFaviconPreview("");
    setFaviconFile(null);
    setValues({ ...values, favicon: "" });
    setShowFaviconInput(true); // Show file input when favicon is removed
    if (faviconRef.current) {
      faviconRef.current.value = ""; // Clears the file input
    }
  };

  useEffect(() => {
    if (!selectedFile && values.logo) {
      setLogoPreview(toAbsUrl(values.logo));
      setShowFileInput(false);
    }
  }, [values.logo, selectedFile]);

  const handleUpdate = (e) => {
    e.preventDefault();
    const errors = validate(values);
    setFormErrors(errors);
    setIsSubmit(true);
    if (Object.keys(errors).length !== 0) {
      return;
    }
    const formData = new FormData();
    for (let key in values) {
      if (key === "countryId" || key === "stateId" || key === "cityId") {
        // If it's an object with _id, use the _id, otherwise use the value directly
        const idValue = values[key] && typeof values[key] === 'object' ? values[key]._id : values[key];
        formData.append(key, idValue);
      } else {
        formData.append(key, values[key]);
      }
    }
    if (selectedFile) {
      formData.append("logo", selectedFile);
    }
    if (faviconFile) {
      formData.append("favicon", faviconFile);
    }
    setIsSubmitting(true);
    updateCompany(adminData._id, formData)
      .then((response) => {
        if (response.data.isOk) {
          toast.success("Company details updated successfully");
          getAdmin();
          // Reset file states after successful update
          setSelectedFile(null);
          resetFaviconStates();
        } else {
          toast.error(response.data.message);
        }
      })
      .catch((error) => {
        console.error("Error updating company details:", error);
        toast.error("Failed to update company details");
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  // Allow only numeric input for mobileNumber and pincode
  const handleChange = async (e) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === "mobileNumber" || name === "pincode") {
      newValue = value.replace(/\D/g, "");
      setValues({ ...values, [name]: newValue });
    } else if (name === "countryId") {
      // Handle country selection
      const selectedCountry = countryList.find(country => country._id === value);
      if (selectedCountry) {
        setValues({
          ...values,
          countryId: value,
          stateId: "",
          cityId: ""
        });
        // Fetch states for selected country
        await fetchStatesByCountry(value);
      }
    } else if (name === "stateId") {
      // Handle state selection
      setValues({
        ...values,
        stateId: value,
        cityId: ""
      });
      // Fetch cities for selected state
      await fetchCitiesByState(value);
    } else if (name === "cityId") {
      // Handle city selection
      setValues({ ...values, cityId: value });
    } else {
      setValues({ ...values, [name]: newValue });
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview("");
    setSelectedFile(null);
    setValues({ ...values, logo: "" });
    setShowFileInput(true); // Show file input when logo is removed
    if (imageRef.current) {
      imageRef.current.value = ""; // Clears the file input
    }
  };

  document.title = `Company Details | Shree Balaji Trade-Wing`;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb maintitle="Setup" title="Company Details" pageTitle="Setup" />
          <Row>
            <Col lg={12}>
              <Card>
                <div>
                  <CardBody>
                    <React.Fragment>
                      <Col xxl={12}>
                        <Card className="">
                          <CardBody>
                            <div className="live-preview">
                              <Row>
                                <Col lg={3}>
                                  <Row>
                                    <Col lg={12}>
                                      <Card>
                                        <CardBody>
                                          <label>Logo</label>
                                          <div className="form-floating mb-3">
                                            {showFileInput ? (
                                              <input
                                                type="file"
                                                name="logo"
                                                className="form-control mt-2"
                                                accept=".jpg, .jpeg, .png"
                                                onChange={handleFileChange}
                                                ref={imageRef}
                                              />
                                            ) : null}

                                            {isSubmit && formErrors.logo && <p className="text-danger">{formErrors.logo}</p>}

                                            {logoPreview && (
                                              <div style={{ position: "relative", display: "inline-block", marginTop: "10px" }}>
                                                <img
                                                  src={logoPreview}
                                                  alt="Logo Preview"
                                                  style={{
                                                    width: "100px",
                                                    height: "100px",
                                                    objectFit: "cover",
                                                    border: "1px solid #ccc",
                                                  }}
                                                />
                                                <button
                                                  type="button"
                                                  onClick={handleRemoveLogo}
                                                  style={{
                                                    position: "absolute",
                                                    top: "-5px",
                                                    right: "-5px",
                                                    background: "red",
                                                    color: "white",
                                                    border: "none",
                                                    borderRadius: "50%",
                                                    width: "20px",
                                                    height: "20px",
                                                    cursor: "pointer",
                                                  }}
                                                >
                                                  &times;
                                                </button>
                                              </div>
                                            )}

                                            {!showFileInput && (
                                              <div className="mt-2">
                                                <button
                                                  type="button"
                                                  className="btn btn-sm btn-primary"
                                                  onClick={() => setShowFileInput(true)}
                                                >
                                                  Change Logo
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        </CardBody>
                                      </Card>
                                    </Col>
                                  </Row>
                                  <Row>
                                    <Col lg={12}>
                                      <Card>
                                        <CardBody>
                                          <Label className="form-label">
                                            Favicon <span className="text-muted">(Max 1MB)</span>
                                          </Label>
                                          {showFaviconInput ? (
                                            <input
                                              type="file"
                                              name="favicon"
                                              className="form-control mt-2"
                                              accept=".jpg, .jpeg, .png, .ico"
                                              onChange={handleFaviconChange}
                                              ref={faviconRef}
                                            />
                                          ) : null}

                                          {faviconPreview && (
                                            <div style={{ position: "relative", display: "inline-block", marginTop: "10px" }}>
                                              <img
                                                src={faviconPreview}
                                                alt="Favicon Preview"
                                                style={{
                                                  width: "32px",
                                                  height: "32px",
                                                  objectFit: "cover",
                                                  border: "1px solid #ccc",
                                                }}
                                              />
                                              <button
                                                type="button"
                                                onClick={handleRemoveFavicon}
                                                style={{
                                                  position: "absolute",
                                                  top: "-5px",
                                                  right: "-5px",
                                                  background: "red",
                                                  color: "white",
                                                  border: "none",
                                                  borderRadius: "50%",
                                                  width: "20px",
                                                  height: "20px",
                                                  cursor: "pointer",
                                                  fontSize: "12px",
                                                }}
                                              >
                                                ×
                                              </button>
                                            </div>
                                          )}
                                        </CardBody>
                                      </Card>
                                    </Col>
                                  </Row>
                                </Col>
                                <Col lg={9}>
                                  <Card>
                                    <CardBody>
                                      <div className="live-preview">
                                        <Form>
                                          <Row>
                                            <Col lg={4}>
                                              <div className="form-floating mb-3">
                                                <input
                                                  type="text"
                                                  className="form-control"
                                                  placeholder="Enter Company name"
                                                  required
                                                  name="companyName"
                                                  value={values.companyName}
                                                  onChange={handleChange}
                                                />
                                                <label className="form-label">
                                                  Company name
                                                  <span className="text-danger"> *</span>
                                                </label>
                                                {isSubmit && formErrors.companyName && (
                                                  <p className="text-danger">
                                                    {formErrors.companyName}
                                                  </p>
                                                )}
                                              </div>
                                            </Col>
                                            <Col lg={4}>
                                              <div className="form-floating mb-3">
                                                <input
                                                  type="text"
                                                  className="form-control"
                                                  placeholder="Enter Email"
                                                  required
                                                  name="email"
                                                  value={values.email}
                                                  onChange={handleChange}
                                                />
                                                <label className="form-label">
                                                  Email
                                                  <span className="text-danger"> *</span>
                                                </label>
                                                {isSubmit && formErrors.email && (
                                                  <p className="text-danger">
                                                    {formErrors.email}
                                                  </p>
                                                )}
                                              </div>
                                            </Col>
                                            <Col lg={4}>
                                              <div className="form-floating mb-3">
                                                <input
                                                  type="text"
                                                  className="form-control"
                                                  placeholder="Website"
                                                  required
                                                  name="website"
                                                  value={values.website}
                                                  onChange={handleChange}
                                                  maxLength={100}
                                                />
                                                <label className="form-label">
                                                  Website
                                                  <span className="text-danger"> *</span>
                                                </label>
                                                {isSubmit && formErrors.website && (
                                                  <p className="text-danger">
                                                    {formErrors.website}
                                                  </p>
                                                )}
                                              </div>
                                            </Col>
                                          </Row>
                                          <Row>
                                            <Col lg={4}>
                                              <div className="form-floating mb-3">
                                                <input
                                                  type="text"
                                                  className="form-control"
                                                  placeholder="Mobile Number"
                                                  required
                                                  name="mobileNumber"
                                                  value={values.mobileNumber}
                                                  onChange={handleChange}
                                                  maxLength={10}
                                                />
                                                <label className="form-label">
                                                  Mobile Number
                                                  <span className="text-danger"> *</span>
                                                </label>
                                                {isSubmit && formErrors.mobileNumber && (
                                                  <p className="text-danger">
                                                    {formErrors.mobileNumber}
                                                  </p>
                                                )}
                                              </div>
                                            </Col>
                                            <Col lg={4}>
                                              <div className="form-floating mb-3">
                                                <input
                                                  type="text"
                                                  className="form-control"
                                                  placeholder="Enter GST Number"
                                                  required
                                                  name="gstNumber"
                                                  value={values.gstNumber}
                                                  onChange={handleChange}
                                                />
                                                <label className="form-label">
                                                  GST Number
                                                  <span className="text-danger"> *</span>
                                                </label>
                                                {isSubmit && formErrors.gstNumber && (
                                                  <p className="text-danger">
                                                    {formErrors.gstNumber}
                                                  </p>
                                                )}
                                              </div>
                                            </Col>
                                          </Row>
                                          <Row>
                                            <Col lg={3}>
                                              <div className="form-floating mb-3">
                                                <Input
                                                  type="select"
                                                  className="form-control"
                                                  name="countryId"
                                                  value={values.countryId}
                                                  onChange={handleChange}
                                                  disabled={isLoading}
                                                >
                                                  <option value="">
                                                    {isLoading ? "Loading countries..." : "Select Country"}
                                                  </option>
                                                  {countryList.map((country) => (
                                                    <option key={country._id} value={country._id}>
                                                      {country.countryName}
                                                    </option>
                                                  ))}
                                                </Input>
                                                <label className="form-label">
                                                  Country
                                                  <span className="text-danger"> *</span>
                                                </label>
                                                {isSubmit && formErrors.countryId && (
                                                  <p className="text-danger">
                                                    {formErrors.countryId}
                                                  </p>
                                                )}
                                              </div>
                                            </Col>
                                            <Col lg={3}>
                                              <div className="form-floating mb-3">
                                                <Input
                                                  type="select"
                                                  className="form-control"
                                                  name="stateId"
                                                  value={values.stateId}
                                                  onChange={handleChange}
                                                  disabled={!values.countryId || isStatesLoading}
                                                >
                                                  <option value="">
                                                    {!values.countryId
                                                      ? "Select Country First"
                                                      : isStatesLoading
                                                        ? "Loading states..."
                                                        : "Select State"}
                                                  </option>
                                                  {stateList.map((state) => (
                                                    <option key={state._id} value={state._id}>
                                                      {state.stateName}
                                                    </option>
                                                  ))}
                                                </Input>
                                                <label className="form-label">
                                                  State
                                                  <span className="text-danger"> *</span>
                                                </label>
                                                {isSubmit && formErrors.stateId && (
                                                  <p className="text-danger">
                                                    {formErrors.stateId}
                                                  </p>
                                                )}
                                              </div>
                                            </Col>
                                            <Col lg={3}>
                                              <div className="form-floating mb-3">
                                                <Input
                                                  type="select"
                                                  className="form-control"
                                                  name="cityId"
                                                  value={values.cityId}
                                                  onChange={handleChange}
                                                  disabled={!values.stateId || isCitiesLoading}
                                                >
                                                  <option value="">
                                                    {!values.stateId
                                                      ? "Select State First"
                                                      : isCitiesLoading
                                                        ? "Loading cities..."
                                                        : "Select City"}
                                                  </option>
                                                  {cityList.map((city) => (
                                                    <option key={city._id} value={city._id}>
                                                      {city.cityName}
                                                    </option>
                                                  ))}
                                                </Input>
                                                <label className="form-label">
                                                  City
                                                  <span className="text-danger"> *</span>
                                                </label>
                                                {isSubmit && formErrors.cityId && (
                                                  <p className="text-danger">
                                                    {formErrors.cityId}
                                                  </p>
                                                )}
                                              </div>
                                            </Col>
                                            <Col lg={3}>
                                              <div className="form-floating mb-3">
                                                <Input
                                                  type="text"
                                                  className="form-control"
                                                  placeholder="Enter Pincode"
                                                  required
                                                  name="pincode"
                                                  value={values.pincode}
                                                  onChange={handleChange}
                                                  maxLength={6}
                                                />
                                                <label htmlFor="role-field" className="form-label">
                                                  Pincode
                                                  <span className="text-danger"> *</span>
                                                </label>
                                                {isSubmit && formErrors.pincode && (
                                                  <p className="text-danger">
                                                    {formErrors.pincode}
                                                  </p>
                                                )}
                                              </div>
                                            </Col>
                                          </Row>
                                          <Row>
                                            <Col lg={12}>
                                              <div className="form-floating mb-3">
                                                <Input
                                                  type="textarea"
                                                  className="form-control"
                                                  placeholder="Enter Address"
                                                  required
                                                  name="address"
                                                  style={{ height: "100px" }}
                                                  value={values.address}
                                                  onChange={handleChange}
                                                />
                                                <label htmlFor="role-field" className="form-label">
                                                  Address
                                                  <span className="text-danger"> *</span>
                                                </label>
                                                {isSubmit && formErrors.address && (
                                                  <p className="text-danger">
                                                    {formErrors.address}
                                                  </p>
                                                )}
                                              </div>
                                            </Col>
                                          </Row>
                                        </Form>
                                      </div>
                                    </CardBody>
                                  </Card>
                                </Col>
                              </Row>
                              <Row></Row>
                              <Col lg={12}>
                                <div className="text-end">
                                  <button
                                    type="submit"
                                    className="btn btn-success m-1"
                                    id="add-btn"
                                    onClick={handleUpdate}
                                    disabled={!hasChanges() || isSubmitting}
                                  >
                                    {isSubmitting ? (
                                      <><Spinner size="sm" className="me-2" />Updating...</>
                                    ) : (
                                      "Update"
                                    )}
                                  </button>
                                </div>
                              </Col>
                            </div>
                          </CardBody>
                        </Card>
                      </Col>
                    </React.Fragment>
                  </CardBody>
                </div>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

    </React.Fragment>
  );
};

export default CompanyDetails;
