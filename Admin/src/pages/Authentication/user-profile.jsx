import React, { useContext } from "react";
import { Container, Row, Col, Card, CardBody } from "reactstrap";
import { AuthContext } from "../../context/AuthContext";
import npLogo from "../../assets/images/np-logo.png";

const UserProfile = () => {
    const { adminData, role } = useContext(AuthContext);
    document.title = `Profile | Nagarpalika Admin`;
    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <Row>
                        <Col lg="12">
                            <Card>
                                <CardBody>
                                    <div className="d-flex">
                                        <div className="mx-3">
                                            <img
                                                src={adminData?.logo_url || npLogo}
                                                alt=""
                                                className="avatar-md rounded-circle img-thumbnail"
                                            />
                                        </div>
                                        <div className="flex-grow-1 align-self-center">
                                            <div className="text-muted">
                                                <h5 className="mb-1">{adminData?.companyName || adminData?.employeeName || "User"}</h5>
                                                <p className="mb-1">
                                                    <strong>Role:</strong> {role}
                                                </p>
                                                <p className="mb-1">
                                                    <strong>Email:</strong> {adminData?.email || adminData?.emailOffice}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>
        </React.Fragment>
    );
};

export default UserProfile;
