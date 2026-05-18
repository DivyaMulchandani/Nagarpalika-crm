import React, { useState, useEffect } from "react";
import { Card, CardBody, Badge, Button, Spinner, Table } from "reactstrap";
import { useNavigate } from "react-router-dom";
import { getPatientAppointments } from "../../../api/appointments.api";

const statusColors = {
  scheduled: "primary",
  confirmed: "info",
  arrived: "warning",
  in_consultation: "secondary",
  completed: "success",
  checked_out: "dark",
  follow_up_planned: "info",
  cancelled: "danger",
  no_show: "danger",
  rescheduled: "warning",
};

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";

const AppointmentsTab = ({ patientId }) => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await getPatientAppointments(patientId);
        if (res.data.isOk) {
          setAppointments(res.data.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch appointments:", err);
      }
      setLoading(false);
    };
    fetch();
  }, [patientId]);

  if (loading) {
    return <div className="text-center py-4"><Spinner size="sm" color="primary" /> Loading appointments...</div>;
  }

  if (!appointments.length) {
    return (
      <Card>
        <CardBody>
          <p className="text-muted mb-0">No appointments found for this patient.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody>
        <div className="table-responsive">
          <Table className="table-hover table-nowrap align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Doctor</th>
                <th>Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a._id}>
                  <td>{formatDate(a.appointmentDate)}</td>
                  <td>{a.startTime || "-"}{a.endTime ? ` - ${a.endTime}` : ""}</td>
                  <td>Dr. {a.doctorId?.doctorName || "-"}</td>
                  <td>{a.appointmentTypeId?.label || "-"}</td>
                  <td>
                    <Badge color={statusColors[a.status] || "secondary"} className="text-capitalize">
                      {a.status?.replace(/_/g, " ") || "-"}
                    </Badge>
                  </td>
                  <td>
                    <Button
                      color="soft-primary"
                      size="sm"
                      onClick={() => navigate(`/appointments/${a._id}`)}
                    >
                      <i className="ri-eye-line me-1"></i>View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
        <div className="text-muted mt-3" style={{ fontSize: "13px" }}>
          Total: {appointments.length} appointment{appointments.length !== 1 ? "s" : ""}
        </div>
      </CardBody>
    </Card>
  );
};

export default AppointmentsTab;
