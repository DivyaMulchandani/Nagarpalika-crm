import React, { useState, useCallback, useContext } from "react";
import { Card, CardBody, CardHeader, Col, Container, Row, Badge } from "reactstrap";
import DataTable from "react-data-table-component";
import { useNavigate } from "react-router-dom";
import { searchCallLetters } from "../../api/callLetters.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";

const CallLetterList = () => {
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions } = useContext(MenuContext);
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(20);
  const [pageNo, setPageNo] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await searchCallLetters({ skip: (pageNo - 1) * perPage, per_page: perPage });
      const rows = res.data.data?.[0];
      const byAdvt = {};
      (rows?.data || []).forEach((cl) => {
        if (!byAdvt[cl.advt_no]) byAdvt[cl.advt_no] = { advt_no: cl.advt_no, enabled: cl.enabled, available_from: cl.available_from, count: 0 };
        byAdvt[cl.advt_no].count++;
      });
      setData(Object.values(byAdvt));
      setTotalRows(rows?.count || 0);
    } catch { setData([]); }
    setLoading(false);
  }, [pageNo, perPage]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const columns = [
    { name: "Advertisement No", selector: (r) => r.advt_no, grow: 2, style: { fontFamily: "monospace" } },
    { name: "Roll Numbers", selector: (r) => r.count, width: "130px", center: true },
    {
      name: "Status",
      cell: (r) => <Badge color={r.enabled ? "success" : "secondary"}>{r.enabled ? "Enabled" : "Disabled"}</Badge>,
      width: "110px", center: true,
    },
    { name: "Available From", selector: (r) => r.available_from ? new Date(r.available_from).toLocaleString("en-IN") : "—", width: "180px" },
    {
      name: "Actions",
      cell: (r) => currentPagePermissions.edit
        ? <button className="btn btn-sm btn-primary" onClick={() => navigate(`/call-letters/${encodeURIComponent(r.advt_no)}/manage`)}>Manage</button>
        : null,
      width: "110px",
    },
  ];

  document.title = `Call Letters | ${adminData?.companyName}`;

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb maintitle="Recruitment" title="Call Letters" pageTitle="Recruitment" />
        <Row><Col lg={12}>
          <Card>
            <CardHeader><h6 className="mb-0">Call Letter Management by Advertisement</h6></CardHeader>
            <CardBody>
              <DataTable columns={columns} data={data} progressPending={loading} pagination paginationServer paginationTotalRows={totalRows} paginationPerPage={perPage} paginationRowsPerPageOptions={[10, 20, 50]} onChangeRowsPerPage={(n) => { setPerPage(n); setPageNo(1); }} onChangePage={(p) => setPageNo(p)} />
            </CardBody>
          </Card>
        </Col></Row>
      </Container>
    </div>
  );
};

export default CallLetterList;
