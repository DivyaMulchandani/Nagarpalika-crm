import React, { useState, useEffect, useContext, useCallback } from "react";
import {
  Row, Col, Button, Input, Label, Spinner, Badge,
} from "reactstrap";
import Select from "react-select";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { getMasterData } from "../../api/masterData.api";
import {
  createPrescription,
  updatePrescription,
  getPrescriptionsByAppointment,
} from "../../api/prescriptions.api";

const emptyMedicine = {
  medicineName: "",
  dosage: "",
  dosageUnitId: "",
  dosageUnitLabel: "",
  frequencyId: "",
  frequencyLabel: "",
  duration: "",
  durationUnitId: "",
  durationUnitLabel: "",
  instructions: "",
};

const PrescriptionPanel = ({
  appointmentId,
  patientId,
  doctorId,
  patientName,
  doctorName,
  appointmentDate,
  isCompleted,
  // Legacy embedded prescriptions from appointment (backward compat)
  embeddedPrescriptions,
}) => {
  const { adminData } = useContext(AuthContext);

  const [prescriptionId, setPrescriptionId] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingRx, setLoadingRx] = useState(true);

  // Master data
  const [dosageUnitList, setDosageUnitList] = useState([]);
  const [frequencyList, setFrequencyList] = useState([]);
  const [durationUnitList, setDurationUnitList] = useState([]);

  // Fetch master data on mount
  useEffect(() => {
    const fetchMaster = async () => {
      const categories = [
        { key: "MEDICINE_DOSAGE_UNIT", setter: setDosageUnitList },
        { key: "PRESCRIPTION_FREQUENCY", setter: setFrequencyList },
        { key: "DURATION_UNIT", setter: setDurationUnitList },
      ];
      for (const { key, setter } of categories) {
        try {
          const res = await getMasterData({ category: key, isActive: true });
          if (res.data.isOk) setter(res.data.data || []);
        } catch { /* ignore */ }
      }
    };
    fetchMaster();
  }, []);

  // Fetch existing prescription for this appointment
  useEffect(() => {
    if (!appointmentId) return;
    const fetchPrescription = async () => {
      setLoadingRx(true);
      try {
        const res = await getPrescriptionsByAppointment(appointmentId);
        if (res.data.isOk && res.data.data?.length > 0) {
          // Use the first (most recent) prescription
          const rx = res.data.data[0];
          setPrescriptionId(rx._id);
          setNotes(rx.notes || "");
          setMedicines(
            rx.medicines.map((m) => ({
              medicineName: m.medicineName || "",
              dosage: m.dosage || "",
              dosageUnitId: m.dosageUnitId?._id || m.dosageUnitId || "",
              dosageUnitLabel: m.dosageUnitId?.label || "",
              frequencyId: m.frequencyId?._id || m.frequencyId || "",
              frequencyLabel: m.frequencyId?.label || "",
              duration: m.duration || "",
              durationUnitId: m.durationUnitId?._id || m.durationUnitId || "",
              durationUnitLabel: m.durationUnitId?.label || "",
              instructions: m.instructions || "",
            }))
          );
        } else if (embeddedPrescriptions?.length > 0) {
          // Fall back to legacy embedded prescriptions
          setMedicines(
            embeddedPrescriptions.map((p) => ({
              medicineName: p.medicineName || "",
              dosage: p.dosage || "",
              dosageUnitId: p.dosageUnitId?._id || p.dosageUnitId || "",
              dosageUnitLabel: p.dosageUnitId?.label || "",
              frequencyId: p.frequencyId?._id || p.frequencyId || "",
              frequencyLabel: p.frequencyId?.label || "",
              duration: p.duration || "",
              durationUnitId: p.durationUnitId?._id || p.durationUnitId || "",
              durationUnitLabel: p.durationUnitId?.label || "",
              instructions: p.instructions || "",
            }))
          );
        }
      } catch (err) {
        console.error("Failed to fetch prescriptions:", err);
      }
      setLoadingRx(false);
    };
    fetchPrescription();
  }, [appointmentId]);

  const addMedicine = () => setMedicines([...medicines, { ...emptyMedicine }]);
  const removeMedicine = (i) => setMedicines(medicines.filter((_, idx) => idx !== i));

  const updateMedicine = (index, field, value) => {
    const updated = [...medicines];
    updated[index] = { ...updated[index], [field]: value };
    setMedicines(updated);
  };

  // ---- Save Prescription ----
  const handleSave = async (andPrint = false) => {
    if (!medicines.length || !medicines.some((m) => m.medicineName?.trim())) {
      toast.warning("Add at least one medicine");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        medicines: medicines.filter((m) => m.medicineName?.trim()).map((m) => ({
          medicineName: m.medicineName,
          dosage: m.dosage,
          dosageUnitId: m.dosageUnitId || undefined,
          frequencyId: m.frequencyId || undefined,
          duration: m.duration ? Number(m.duration) : undefined,
          durationUnitId: m.durationUnitId || undefined,
          instructions: m.instructions,
        })),
        notes: notes || undefined,
      };

      let savedId = prescriptionId;

      if (prescriptionId) {
        // Update existing
        const res = await updatePrescription(prescriptionId, payload);
        if (res.data.isOk) {
          toast.success("Prescription saved");
        } else {
          toast.error(res.data.message || "Failed to save prescription");
          setSaving(false);
          return;
        }
      } else {
        // Create new
        const res = await createPrescription({
          ...payload,
          appointmentId,
          patientId,
          doctorId,
        });
        if (res.data.isOk) {
          savedId = res.data.data._id;
          setPrescriptionId(savedId);
          toast.success("Prescription saved");
        } else {
          toast.error(res.data.message || "Failed to save prescription");
          setSaving(false);
          return;
        }
      }

      if (andPrint) {
        handlePrint();
      }
    } catch (err) {
      toast.error("Failed to save prescription");
    }
    setSaving(false);
  };

  // ---- Print ----
  const handlePrint = () => {
    const date = appointmentDate
      ? new Date(appointmentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : "";

    const activeMedicines = medicines.filter((m) => m.medicineName?.trim());
    const prescriptionRows = activeMedicines.map((m, i) => {
      const dosUnit = dosageUnitList.find((u) => u._id === m.dosageUnitId);
      const freq = frequencyList.find((f) => f._id === m.frequencyId);
      const durUnit = durationUnitList.find((u) => u._id === m.durationUnitId);
      return `<tr>
        <td style="padding:8px;border:1px solid #dee2e6">${i + 1}</td>
        <td style="padding:8px;border:1px solid #dee2e6;font-weight:600">${m.medicineName || "-"}</td>
        <td style="padding:8px;border:1px solid #dee2e6">${m.dosage || "-"}${dosUnit ? " " + dosUnit.label : ""}</td>
        <td style="padding:8px;border:1px solid #dee2e6">${freq?.label || "-"}</td>
        <td style="padding:8px;border:1px solid #dee2e6">${m.duration || "-"} ${durUnit?.label || ""}</td>
        <td style="padding:8px;border:1px solid #dee2e6">${m.instructions || "-"}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><title>Prescription</title>
      <style>body{font-family:Arial,sans-serif;margin:0;padding:20px}
      .header{text-align:center;border-bottom:2px solid #333;padding-bottom:15px;margin-bottom:20px}
      .header h2{margin:0;color:#333} .header p{margin:4px 0;color:#666;font-size:13px}
      .patient-info{display:flex;justify-content:space-between;margin-bottom:20px;padding:10px;background:#f8f9fa;border-radius:6px}
      .rx{font-size:28px;font-weight:bold;color:#0d6efd;margin:15px 0}
      table{width:100%;border-collapse:collapse;margin-bottom:20px}
      th{background:#f0f0f0;padding:8px;border:1px solid #dee2e6;text-align:left;font-size:13px}
      td{font-size:13px}
      .notes{margin-top:15px;padding:10px;background:#fffbea;border-left:3px solid #ffc107;font-size:13px}
      .footer{margin-top:40px;text-align:right;padding-top:15px}
      .signature-line{border-top:1px solid #333;display:inline-block;width:200px;padding-top:5px}
      @media print{body{margin:0;padding:15px}}</style></head>
      <body>
        <div class="header">
          <h2>${adminData?.companyName || "Clinic"}</h2>
          <p>${adminData?.companyAddress || ""}</p>
        </div>
        <div class="patient-info">
          <div><strong>Patient:</strong> ${patientName || "Patient"}</div>
          <div><strong>Date:</strong> ${date}</div>
          <div><strong>Doctor:</strong> Dr. ${doctorName || ""}</div>
        </div>
        <div class="rx">&#8478;</div>
        <table><thead><tr>
          <th>#</th><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Instructions</th>
        </tr></thead><tbody>${prescriptionRows}</tbody></table>
        ${notes ? `<div class="notes"><strong>Notes:</strong> ${notes}</div>` : ""}
        <div class="footer">
          <div class="signature-line">Doctor's Signature</div>
        </div>
      </body></html>`;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  if (loadingRx) {
    return <div className="text-center py-3"><Spinner size="sm" color="primary" /> Loading prescriptions...</div>;
  }

  return (
    <div>
      {/* Medicine Rows */}
      {medicines.map((m, i) => (
        <Row key={i} className="align-items-end mb-3 border-bottom pb-3">
          <Col md={3}>
            <Label className="form-label">Medicine Name</Label>
            <Input
              value={m.medicineName}
              onChange={(e) => updateMedicine(i, "medicineName", e.target.value)}
              disabled={isCompleted}
              placeholder="e.g. Amoxicillin"
            />
          </Col>
          <Col md={1}>
            <Label className="form-label">Dosage</Label>
            <Input
              value={m.dosage}
              onChange={(e) => updateMedicine(i, "dosage", e.target.value)}
              disabled={isCompleted}
              placeholder="500"
            />
          </Col>
          <Col md={1}>
            <Label className="form-label">Unit</Label>
            <Select
              options={dosageUnitList.map((d) => ({ value: d._id, label: d.label }))}
              value={m.dosageUnitId ? { value: m.dosageUnitId, label: m.dosageUnitLabel || dosageUnitList.find((d) => d._id === m.dosageUnitId)?.label || "" } : null}
              onChange={(opt) => {
                const updated = [...medicines];
                updated[i] = { ...updated[i], dosageUnitId: opt?.value || "", dosageUnitLabel: opt?.label || "" };
                setMedicines(updated);
              }}
              isClearable
              isDisabled={isCompleted}
              placeholder="mg"
              menuPortalTarget={document.body}
              styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
            />
          </Col>
          <Col md={2}>
            <Label className="form-label">Frequency</Label>
            <Select
              options={frequencyList.map((f) => ({ value: f._id, label: f.label }))}
              value={m.frequencyId ? { value: m.frequencyId, label: m.frequencyLabel || frequencyList.find((f) => f._id === m.frequencyId)?.label || "" } : null}
              onChange={(opt) => {
                const updated = [...medicines];
                updated[i] = { ...updated[i], frequencyId: opt?.value || "", frequencyLabel: opt?.label || "" };
                setMedicines(updated);
              }}
              isClearable
              isDisabled={isCompleted}
              placeholder="Select..."
              menuPortalTarget={document.body}
              styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
            />
          </Col>
          <Col md={1}>
            <Label className="form-label">Duration</Label>
            <Input
              type="number"
              min="1"
              value={m.duration}
              onChange={(e) => updateMedicine(i, "duration", e.target.value)}
              disabled={isCompleted}
              placeholder="7"
            />
          </Col>
          <Col md={2}>
            <Label className="form-label">Unit</Label>
            <Select
              options={durationUnitList.map((d) => ({ value: d._id, label: d.label }))}
              value={m.durationUnitId ? { value: m.durationUnitId, label: m.durationUnitLabel || durationUnitList.find((d) => d._id === m.durationUnitId)?.label || "" } : null}
              onChange={(opt) => {
                const updated = [...medicines];
                updated[i] = { ...updated[i], durationUnitId: opt?.value || "", durationUnitLabel: opt?.label || "" };
                setMedicines(updated);
              }}
              isClearable
              isDisabled={isCompleted}
              placeholder="Days"
              menuPortalTarget={document.body}
              styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
            />
          </Col>
          <Col md={1} className="text-center">
            {!isCompleted && (
              <Button color="soft-danger" size="sm" onClick={() => removeMedicine(i)} title="Remove">
                <i className="ri-delete-bin-line"></i>
              </Button>
            )}
          </Col>
          <Col md={12} className="mt-2">
            <Input
              placeholder="Special instructions (e.g. after food, before bed)..."
              value={m.instructions}
              onChange={(e) => updateMedicine(i, "instructions", e.target.value)}
              disabled={isCompleted}
              bsSize="sm"
            />
          </Col>
        </Row>
      ))}

      {/* Add Medicine + Notes */}
      {!isCompleted && (
        <Button color="soft-primary" size="sm" onClick={addMedicine} className="mb-3">
          <i className="ri-add-line me-1"></i>Add Medicine
        </Button>
      )}

      {medicines.length === 0 && <p className="text-muted mt-2 mb-3">No prescriptions added yet.</p>}

      {/* General Notes */}
      {(medicines.length > 0 || notes) && (
        <div className="mb-3">
          <Label className="form-label">General Notes</Label>
          <Input
            type="textarea"
            rows="2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isCompleted}
            placeholder="General prescription notes..."
          />
        </div>
      )}

      {/* Action Buttons */}
      {medicines.length > 0 && (
        <div className="d-flex gap-2">
          {!isCompleted && (
            <>
              <Button color="primary" size="sm" onClick={() => handleSave(false)} disabled={saving}>
                <i className="ri-save-line me-1"></i>{saving ? "Saving..." : "Save Prescription"}
              </Button>
              <Button color="success" size="sm" onClick={() => handleSave(true)} disabled={saving}>
                <i className="ri-printer-line me-1"></i>Save & Print
              </Button>
            </>
          )}
          {isCompleted && (
            <Button color="soft-success" size="sm" onClick={handlePrint}>
              <i className="ri-printer-line me-1"></i>Print Prescription
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default PrescriptionPanel;
