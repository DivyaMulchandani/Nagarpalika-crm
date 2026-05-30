import React, { useState, useCallback, useContext } from "react";
import { Card, CardBody, CardHeader, Col, Container, Row, Badge } from "reactstrap";
import DataTable from "react-data-table-component";
import { useNavigate } from "react-router-dom";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";
import api from "../../api/index";
import { ENDPOINTS } from "../../api/endpoints";

const statusColor = { Published: "success", Draft: "secondary", Closed: "danger", Archived: "dark" };

const CallLetterList = () => {
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions } = useContext(MenuContext);
  const navigate = useNavigate();

  const [data, setData]           = useState([]);
  const [loading, setLoading]     = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage]     = useState(20);
  const [pageNo, setPageNo]       = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(ENDPOINTS.ADVERTISEMENTS.BASE, {
        params: { page: pageNo, limit: perPage },
      });
      setData(res.data.data || []);
      setTotalRows(res.data.pagination?.total || 0);
    } catch {
      setData([]);
    }
    setLoading(false);
  }, [pageNo, perPage]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const columns = [
    {
      name: "Advt No.",
      selector: (r) => r.advt_no,
      width: "160px",
      style: { fontFamily: "monospace", fontSize: 12 },
    },
    {
      name: "Post Title",
      cell: (r) => r.post_title?.en || r.post_title || "—",
      grow: 2,
    },
    {
      name: "Status",
      cell: (r) => <Badge color={statusColor[r.status] || "secondary"}>{r.status}</Badge>,
      width: "110px",
      center: true,
    },
    {
      name: "Last Date",
      selector: (r) => fmtDate(r.last_date),
      width: "130px",
    },
    {
      name: "Manage",
      cell: (r) =>
        currentPagePermissions?.edit ? (
          <button
            className="btn btn-sm btn-primary"
            onClick={() => navigate(`/call-letters/${encodeURIComponent(r.advt_no)}/manage`)}
          >
            Manage
          </button>
        ) : null,
      width: "120px",
      center: true,
    },
  ];

  document.title = `Call Letters | ${adminData?.companyName || "Admin"}`;

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb maintitle="Recruitment" title="Call Letters" pageTitle="Recruitment" />
        <Row>
          <Col lg={12}>
            <Card>
              <CardHeader>
                <h6 className="mb-0">Manage Call Letters by Advertisement</h6>
              </CardHeader>
              <CardBody>
                <DataTable
                  columns={columns}
                  data={data}
                  progressPending={loading}
                  pagination
                  paginationServer
                  paginationTotalRows={totalRows}
                  paginationPerPage={perPage}
                  paginationRowsPerPageOptions={[10, 20, 50]}
                  onChangeRowsPerPage={(n) => { setPerPage(n); setPageNo(1); }}
                  onChangePage={(p) => setPageNo(p)}
                />
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default CallLetterList;
