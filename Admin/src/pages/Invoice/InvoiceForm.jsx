import React, { useState, useEffect, useContext } from "react";
import {
  Card, CardBody, CardHeader, Col, Container, Row,
  Form, Input, Label, Button, Table, Badge, Modal, ModalHeader, ModalBody, ModalFooter,
} from "reactstrap";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { createInvoice, updateInvoice, getInvoiceById, recordPayment } from "../../api/invoices.api";
import { getPatientAppointments } from "../../api/appointments.api";
import { getMasterData } from "../../api/masterData.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import Select from "react-select";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";

const initialState = {
  patientId: "",
  appointmentId: "",
  lineItems: [],
  discountType: "",
  discountValue: 0,
  dueDate: "",
  notes: "",
};

const InvoiceForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions } = useContext(MenuContext);

  const isEdit = !!id && location.pathname.endsWith("/edit");
  const isView = !!id && !location.pathname.endsWith("/edit");

  const [values, setValues] = useState(initialState);
  const [invoiceData, setInvoiceData] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmit, setIsSubmit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientOptions, setPatientOptions] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);

  // Appointment-based billing
  const [patientAppointments, setPatientAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);

  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);

  useEffect(() => {
    getMasterData({ category: "PAYMENT_METHOD", isActive: true })
      .then((res) => { if (res.data.isOk) setPaymentMethods(res.data.data || []); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (id) {
      setIsFetching(true);
      getInvoiceById(id)
        .then((res) => {
          const inv = res.data.data;
          setInvoiceData(inv);
          setValues({
            patientId: inv.patientId?._id || inv.patientId || "",
            appointmentId: inv.appointmentId?._id || inv.appointmentId || "",
            lineItems: inv.lineItems || [],
            discountType: inv.discountType || "",
            discountValue: inv.discountValue || 0,
            dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split("T")[0] : "",
            notes: inv.notes || "",
          });
          if (inv.patientId?._id) {
            const p = inv.patientId;
            setSelectedPatient({ value: p._id, label: `${p.firstName || ""} ${p.lastName || ""} (${p.patientId || ""})` });
          }
        })
        .catch(() => toast.error("Failed to fetch invoice"))
        .finally(() => setIsFetching(false));
    }
  }, [id]);

  // Fetch patient's billable appointments when patient is selected (create mode only)
  useEffect(() => {
    if (values.patientId && !isEdit && !isView) {
      setAppointmentsLoading(true);
      getPatientAppointments(values.patientId)
        .then((res) => {
          if (res.data.isOk) {
            // Show completed/checked_out appointments that can be billed
            const billable = (res.data.data || []).filter((a) =>
              ["completed", "checked_out", "follow_up_planned"].includes(a.status)
            );
            setPatientAppointments(billable);
          }
        })
        .catch(() => setPatientAppointments([]))
        .finally(() => setAppointmentsLoading(false));
    } else if (!values.patientId) {
      setPatientAppointments([]);
      setSelectedAppointment(null);
    }
  }, [values.patientId]);

  // When an appointment is selected, auto-populate line items from its procedures
  const handleAppointmentSelect = (opt) => {
    setSelectedAppointment(opt);
    if (!opt) {
      setValues((prev) => ({ ...prev, appointmentId: "", lineItems: [] }));
      return;
    }
    const appt = patientAppointments.find((a) => a._id === opt.value);
    if (!appt) return;

    const lineItems = [];
    // Add procedures as line items
    if (appt.procedures && appt.procedures.length > 0) {
      appt.procedures.forEach((proc) => {
        lineItems.push({
          description: proc.procedureId?.label || proc.procedureName || "Procedure",
          quantity: proc.quantity || 1,
          unitCost: proc.cost || 0,
          taxable: false,
          taxRate: 0,
        });
      });
    }

    // If no procedures, add consultation fee as a line item
    if (lineItems.length === 0) {
      const docName = appt.doctorId?.doctorName || "Doctor";
      lineItems.push({
        description: `Consultation - ${docName}`,
        quantity: 1,
        unitCost: appt.doctorId?.consultationFee || 0,
        taxable: false,
        taxRate: 0,
      });
    }

    setValues((prev) => ({
      ...prev,
      appointmentId: appt._id,
      lineItems,
    }));
  };

  useEffect(() => {
    if (patientSearch.length >= 2) {
      import("../../api/patients.api").then((mod) => {
        const searchFn = mod.searchPatients || mod.default?.searchPatients;
        if (searchFn) {
          searchFn({ skip: 0, per_page: 20, match: patientSearch, isActive: true, isDeleted: false })
            .then((res) => {
              if (res.data.data && res.data.data.length > 0) {
                setPatientOptions((res.data.data[0].data || []).map((p) => ({
                  value: p._id,
                  label: `${p.firstName || ""} ${p.lastName || ""} (${p.patientId || ""}) - ${p.mobileNumber || ""}`,
                })));
              }
            })
            .catch(() => {});
        }
      });
    }
  }, [patientSearch]);

  const validate = (v) => {
    const errors = {};
    if (!v.patientId) errors.patientId = "Patient is required!";
    if (!v.lineItems || v.lineItems.length === 0) errors.lineItems = "At least one line item is required!";
    return errors;
  };

  const handleChange = (e) => setValues({ ...values, [e.target.name]: e.target.value });

  const addLineItem = () => {
    setValues({
      ...values,
      lineItems: [...values.lineItems, { description: "", quantity: 1, unitCost: 0, taxable: false, taxRate: 0 }],
    });
  };

  const updateLineItem = (idx, field, val) => {
    const updated = [...values.lineItems];
    updated[idx] = { ...updated[idx], [field]: val };
    setValues({ ...values, lineItems: updated });
  };

  const removeLineItem = (idx) => {
    setValues({ ...values, lineItems: values.lineItems.filter((_, i) => i !== idx) });
  };

  const subtotal = values.lineItems.reduce((sum, item) => sum + ((Number(item.unitCost) || 0) * (Number(item.quantity) || 1)), 0);
  let discountAmount = 0;
  if (values.discountType === "percentage") discountAmount = subtotal * (Number(values.discountValue) / 100);
  else if (values.discountType === "fixed") discountAmount = Number(values.discountValue);
  const taxAmount = values.lineItems.reduce((sum, item) => {
    if (item.taxable && item.taxRate) {
      return sum + ((Number(item.unitCost) || 0) * (Number(item.quantity) || 1) * (Number(item.taxRate) / 100));
    }
    return sum;
  }, 0);
  const grandTotal = Math.max(0, subtotal - discountAmount + taxAmount);

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validate(values);
    setFormErrors(errors);
    setIsSubmit(true);
    if (Object.keys(errors).length > 0) return;

    setIsLoading(true);
    const action = isEdit ? updateInvoice(id, values) : createInvoice(values);
    action
      .then((res) => {
        if (res.data.isOk) {
          toast.success(isEdit ? "Invoice Updated!" : "Invoice Created!");
          navigate("/invoices");
        } else {
          toast.error(res.data.message || "Failed");
        }
      })
      .catch((err) => toast.error(err?.response?.data?.message || "Failed. Please try again."))
      .finally(() => setIsLoading(false));
  };

  const handleRecordPayment = async () => {
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setIsPaymentLoading(true);
    try {
      const res = await recordPayment({
        invoiceId: id,
        amount: Number(paymentAmount),
        paymentMethodId: paymentMethodId || undefined,
        notes: paymentNotes,
      });
      if (res.data.isOk) {
        toast.success(`Payment recorded! Receipt: ${res.data.data.receiptNumber}`);
        setPaymentModal(false);
        setPaymentAmount("");
        setPaymentMethodId("");
        setPaymentNotes("");
        getInvoiceById(id).then((r) => setInvoiceData(r.data.data)).catch(() => {});
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to record payment");
    }
    setIsPaymentLoading(false);
  };

  const title = isEdit ? "Edit Invoice" : isView ? "View Invoice" : "New Invoice";
  document.title = `${title} | ${adminData?.companyName}`;

  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb maintitle="Billing" title={title} pageTitle="Invoices" />
        <Row>
          <Col lg={12}>
            <Card>
              <CardHeader className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  {title}
                  {invoiceData?.invoiceNumber && <span className="text-muted ms-2">({invoiceData.invoiceNumber})</span>}
                </h5>
                <div className="d-flex gap-2">
                  {isView && invoiceData && invoiceData.balanceAmount > 0 && currentPagePermissions.write && (
                    <Button color="primary" size="sm" onClick={() => setPaymentModal(true)}>
                      <i className="ri-money-dollar-circle-line me-1"></i>Record Payment
                    </Button>
                  )}
                  {isView && currentPagePermissions.edit && invoiceData?.status !== "paid" && (
                    <Button color="success" size="sm" onClick={() => navigate(`/invoices/${id}/edit`)}>
                      <i className="ri-edit-line me-1"></i>Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardBody>
                {isFetching ? (
                  <div className="text-center py-4"><span className="spinner-border spinner-border-sm"></span></div>
                ) : (
                  <Form>
                    <Row>
                      <Col md={6}>
                        <div className="mb-3">
                          <Label>Patient <span className="text-danger">*</span></Label>
                          <Select
                            options={patientOptions}
                            value={selectedPatient}
                            onInputChange={(val) => setPatientSearch(val)}
                            onChange={(opt) => { setSelectedPatient(opt); setValues({ ...values, patientId: opt ? opt.value : "" }); }}
                            isClearable
                            isDisabled={isView || isEdit}
                            placeholder="Search patient..."
                          />
                          {isSubmit && formErrors.patientId && <p className="text-danger mt-1">{formErrors.patientId}</p>}
                        </div>
                      </Col>
                      <Col md={6}>
                        {!isView && !isEdit && values.patientId && (
                          <div className="mb-3">
                            <Label>Appointment <small className="text-muted">(select to auto-fill charges)</small></Label>
                            {appointmentsLoading ? (
                              <div><span className="spinner-border spinner-border-sm"></span> Loading appointments...</div>
                            ) : patientAppointments.length === 0 ? (
                              <p className="text-muted mb-0" style={{ fontSize: "12px" }}>No billable appointments found for this patient.</p>
                            ) : (
                              <Select
                                options={patientAppointments.map((a) => {
                                  const date = new Date(a.appointmentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                                  const docName = a.doctorId?.doctorName || "";
                                  const procCount = a.procedures?.length || 0;
                                  const amount = a.netAmount || a.totalCost || 0;
                                  return {
                                    value: a._id,
                                    label: `${date} | ${docName} | ${procCount} procedure${procCount !== 1 ? "s" : ""} | ₹${amount}`,
                                  };
                                })}
                                value={selectedAppointment}
                                onChange={handleAppointmentSelect}
                                isClearable
                                placeholder="Select appointment to bill..."
                              />
                            )}
                          </div>
                        )}
                        {(isView || isEdit) && values.appointmentId && (
                          <div className="mb-3">
                            <Label>Linked Appointment</Label>
                            <Input type="text" disabled value={values.appointmentId} />
                          </div>
                        )}
                      </Col>
                    </Row>
                    <Row>
                      <Col md={3}>
                        <div className="form-floating mb-3">
                          <Input type="date" name="dueDate" value={values.dueDate} onChange={handleChange} disabled={isView} placeholder="Due Date" />
                          <Label>Due Date</Label>
                        </div>
                      </Col>
                      {isView && invoiceData && (
                        <Col md={3} className="d-flex align-items-center">
                          <Badge color={
                            invoiceData.status === "paid" ? "success" :
                            invoiceData.status === "partially_paid" ? "warning" :
                            invoiceData.status === "overdue" ? "danger" : "primary"
                          } className="text-capitalize p-2 fs-12">
                            {invoiceData.status?.replace(/_/g, " ")}
                          </Badge>
                        </Col>
                      )}
                    </Row>

                    <div className="d-flex justify-content-between align-items-center mt-3 mb-2">
                      <h6 className="mb-0">Line Items</h6>
                      {!isView && <Button color="soft-primary" size="sm" onClick={addLineItem}>+ Add Item</Button>}
                    </div>
                    {isSubmit && formErrors.lineItems && <p className="text-danger">{formErrors.lineItems}</p>}

                    {values.lineItems.length > 0 && (
                      <Table responsive bordered size="sm" className="mt-2">
                        <thead>
                          <tr>
                            <th>Description</th>
                            <th>Qty</th>
                            <th>Unit Cost</th>
                            <th>Taxable</th>
                            <th>Tax Rate %</th>
                            <th>Total</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {values.lineItems.map((item, idx) => {
                            const itemTotal = (Number(item.unitCost) || 0) * (Number(item.quantity) || 1);
                            return (
                              <tr key={idx}>
                                <td><Input type="text" value={item.description || ""} onChange={(e) => updateLineItem(idx, "description", e.target.value)} disabled={isView} /></td>
                                <td><Input type="number" min="1" value={item.quantity} onChange={(e) => updateLineItem(idx, "quantity", e.target.value)} disabled={isView} style={{ width: "70px" }} /></td>
                                <td><Input type="number" min="0" value={item.unitCost} onChange={(e) => updateLineItem(idx, "unitCost", e.target.value)} disabled={isView} style={{ width: "110px" }} /></td>
                                <td className="text-center">
                                  <Input type="checkbox" checked={!!item.taxable} onChange={(e) => updateLineItem(idx, "taxable", e.target.checked)} disabled={isView} />
                                </td>
                                <td><Input type="number" min="0" value={item.taxRate || 0} onChange={(e) => updateLineItem(idx, "taxRate", e.target.value)} disabled={isView || !item.taxable} style={{ width: "80px" }} /></td>
                                <td className="text-end">₹{itemTotal.toFixed(2)}</td>
                                <td>{!isView && <Button color="danger" size="sm" onClick={() => removeLineItem(idx)}>×</Button>}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </Table>
                    )}

                    <Row className="mt-3">
                      <Col md={6}>
                        <Row>
                          <Col md={6}>
                            <div className="mb-3">
                              <Label>Discount Type</Label>
                              <Input type="select" name="discountType" value={values.discountType} onChange={handleChange} disabled={isView}>
                                <option value="">None</option>
                                <option value="percentage">Percentage</option>
                                <option value="fixed">Fixed Amount</option>
                              </Input>
                            </div>
                          </Col>
                          <Col md={6}>
                            <div className="form-floating mb-3">
                              <Input type="number" min="0" name="discountValue" value={values.discountValue} onChange={handleChange} disabled={isView || !values.discountType} placeholder="Value" />
                              <Label>Discount Value</Label>
                            </div>
                          </Col>
                        </Row>
                        <div className="form-floating mb-3">
                          <Input type="textarea" name="notes" value={values.notes} onChange={handleChange} disabled={isView} style={{ height: "80px" }} placeholder="Notes" />
                          <Label>Notes</Label>
                        </div>
                      </Col>
                      <Col md={6}>
                        <Table bordered>
                          <tbody>
                            <tr><td>Subtotal</td><td className="text-end">₹{subtotal.toFixed(2)}</td></tr>
                            <tr><td>Discount</td><td className="text-end">- ₹{discountAmount.toFixed(2)}</td></tr>
                            <tr><td>Tax</td><td className="text-end">+ ₹{taxAmount.toFixed(2)}</td></tr>
                            <tr className="table-primary"><td><strong>Grand Total</strong></td><td className="text-end"><strong>₹{grandTotal.toFixed(2)}</strong></td></tr>
                            {isView && invoiceData && (
                              <>
                                <tr className="table-success"><td>Paid</td><td className="text-end">₹{(invoiceData.paidAmount || 0).toFixed(2)}</td></tr>
                                <tr className="table-warning"><td><strong>Balance</strong></td><td className="text-end"><strong>₹{(invoiceData.balanceAmount || 0).toFixed(2)}</strong></td></tr>
                              </>
                            )}
                          </tbody>
                        </Table>
                      </Col>
                    </Row>

                    {isView && invoiceData?.payments && invoiceData.payments.length > 0 && (
                      <>
                        <h6 className="mt-4 mb-2">Payment History</h6>
                        <Table responsive bordered size="sm">
                          <thead>
                            <tr><th>Receipt #</th><th>Date</th><th>Amount</th><th>Method</th><th>Notes</th></tr>
                          </thead>
                          <tbody>
                            {invoiceData.payments.map((p) => (
                              <tr key={p._id}>
                                <td>{p.receiptNumber}</td>
                                <td>{formatDate(p.paymentDate)}</td>
                                <td>₹{(p.amount || 0).toFixed(2)}</td>
                                <td>{p.paymentMethodId?.label || "-"}</td>
                                <td>{p.notes || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </>
                    )}

                    {!isView ? (
                      <div className="hstack gap-2 mt-4">
                        <Button color="success" onClick={handleSubmit} disabled={isLoading}>
                          {isLoading ? <><span className="spinner-border spinner-border-sm me-1"></span>{isEdit ? "Updating..." : "Creating..."}</> : isEdit ? "Update" : "Create Invoice"}
                        </Button>
                        <Button color="outline-danger" onClick={() => navigate("/invoices")} disabled={isLoading}>Cancel</Button>
                      </div>
                    ) : (
                      <div className="hstack gap-2 mt-4">
                        <Button color="secondary" onClick={() => navigate("/invoices")}>Back to List</Button>
                      </div>
                    )}
                  </Form>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>

      <Modal isOpen={paymentModal} toggle={() => setPaymentModal(false)}>
        <ModalHeader toggle={() => setPaymentModal(false)}>Record Payment</ModalHeader>
        <ModalBody>
          <div className="mb-3">
            <Label>Balance: <strong>₹{(invoiceData?.balanceAmount || 0).toFixed(2)}</strong></Label>
          </div>
          <div className="form-floating mb-3">
            <Input type="number" min="0" max={invoiceData?.balanceAmount} value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="Amount" />
            <Label>Amount <span className="text-danger">*</span></Label>
          </div>
          <div className="mb-3">
            <Label>Payment Method</Label>
            <Select
              options={paymentMethods.map((m) => ({ value: m._id, label: m.label }))}
              value={paymentMethods.filter((m) => m._id === paymentMethodId).map((m) => ({ value: m._id, label: m.label }))[0] || null}
              onChange={(opt) => setPaymentMethodId(opt ? opt.value : "")}
              isClearable
              placeholder="Select method"
            />
          </div>
          <div className="form-floating mb-3">
            <Input type="textarea" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} style={{ height: "80px" }} placeholder="Notes" />
            <Label>Notes</Label>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setPaymentModal(false)}>Cancel</Button>
          <Button color="success" onClick={handleRecordPayment} disabled={isPaymentLoading}>
            {isPaymentLoading ? "Recording..." : "Record Payment"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default InvoiceForm;
