import React, { useContext } from "react";
import { Container, Row, Col, Card, CardBody } from "reactstrap";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

const UserProfile = () => {
    const { adminData } = useContext(AuthContext);
    document.title = `Profile | Trivedi Associates & Tecknical Services Pvt. Ltd.`;
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
                                                src={`/${adminData?.logo}`}
                                                alt=""
                                                className="avatar-md rounded-circle img-thumbnail"
                                            />
                                        </div>
                                        <div className="flex-grow-1 align-self-center">
                                            <div className="text-muted">
                                                <p className="mb-1">
                                                    Email Id :{" "}
                                                    {adminData?.email}
                                                </p>
                                                {/* <p className="mb-0">Id No : #{idx}</p> */}
                                            </div>
                                        </div>
                                    </div>
                                    <div></div>
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
