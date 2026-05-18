import React, { useState, useEffect, useCallback } from "react";
import {
    Card,
    CardBody,
    CardHeader,
    Col,
    Row,
    Input,
    Label,
    Button,
    Table,
} from "reactstrap";
import Select from "react-select";
import { toast } from "react-toastify";
import {
    listDocuments,
    uploadDocument,
    deleteDocument,
} from "../../../api/patients.api";
import { getMasterData } from "../../../api/masterData.api";
import config from "../../../config";

const formatBytes = (b) => {
    if (!b) return "-";
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(2)} MB`;
};

const DocumentsTab = ({ patientId }) => {
    const [docs, setDocs] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [file, setFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const fetchDocs = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await listDocuments(patientId);
            if (res.data.isOk) setDocs(res.data.data || []);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load documents");
        } finally {
            setIsLoading(false);
        }
    }, [patientId]);

    const fetchCategories = useCallback(async () => {
        try {
            const res = await getMasterData({
                category: "FILE_UPLOAD_CATEGORY",
                isActive: true,
            });
            if (res.data.isOk) setCategories(res.data.data || []);
        } catch (err) {
            console.error(err);
        }
    }, []);

    useEffect(() => {
        fetchDocs();
        fetchCategories();
    }, [fetchDocs, fetchCategories]);

    const categoryOptions = categories.map((c) => ({
        value: c._id,
        label: c.label,
    }));

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) {
            toast.warning("Select a file first");
            return;
        }
        const formData = new FormData();
        formData.append("document", file);
        if (selectedCategory) {
            formData.append("categoryId", selectedCategory.value);
        }
        setIsUploading(true);
        try {
            const res = await uploadDocument(patientId, formData);
            if (res.data.isOk) {
                toast.success("Document uploaded");
                setFile(null);
                setSelectedCategory(null);
                document.getElementById("doc-file-input").value = "";
                fetchDocs();
            } else {
                toast.error(res.data.message || "Upload failed");
            }
        } catch (err) {
            console.error(err);
            toast.error(
                err?.response?.data?.message || "Upload failed",
            );
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = (id) => {
        if (!window.confirm("Remove this document?")) return;
        deleteDocument(id)
            .then(() => {
                toast.success("Document removed");
                fetchDocs();
            })
            .catch((err) => {
                console.error(err);
                toast.error("Failed to remove document");
            });
    };

    const buildDownloadUrl = (filePath) => {
        if (!filePath) return "#";
        const cleanPath = filePath.replace(/^uploads\//, "");
        return `${config.api.API_URL}/uploads/${cleanPath}`;
    };

    return (
        <Card>
            <CardHeader>
                <h5 className="mb-0">Documents</h5>
                <small className="text-muted">
                    PDF and image files (JPG, PNG, GIF, WebP). Max 10 MB.
                </small>
            </CardHeader>
            <CardBody>
                <form onSubmit={handleUpload} className="mb-4">
                    <Row className="align-items-end">
                        <Col md={4}>
                            <Label>Category</Label>
                            <Select
                                options={categoryOptions}
                                value={selectedCategory}
                                onChange={setSelectedCategory}
                                isClearable
                                placeholder="Select category"
                            />
                        </Col>
                        <Col md={5}>
                            <Label>File</Label>
                            <Input
                                id="doc-file-input"
                                type="file"
                                accept="application/pdf,image/*"
                                onChange={(e) =>
                                    setFile(e.target.files?.[0] || null)
                                }
                            />
                        </Col>
                        <Col md={3}>
                            <Button
                                type="submit"
                                color="success"
                                disabled={isUploading}
                                className="w-100"
                            >
                                {isUploading ? "Uploading..." : "Upload"}
                            </Button>
                        </Col>
                    </Row>
                </form>

                <div className="table-responsive">
                    <Table className="mb-0">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>File</th>
                                <th>Category</th>
                                <th>Size</th>
                                <th>Uploaded By</th>
                                <th>Uploaded At</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading && (
                                <tr>
                                    <td colSpan={7} className="text-center">
                                        Loading...
                                    </td>
                                </tr>
                            )}
                            {!isLoading && docs.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="text-center text-muted"
                                    >
                                        No documents uploaded yet.
                                    </td>
                                </tr>
                            )}
                            {docs.map((d, idx) => (
                                <tr key={d._id}>
                                    <td>{idx + 1}</td>
                                    <td>{d.fileName}</td>
                                    <td>{d.categoryId?.label || "-"}</td>
                                    <td>{formatBytes(d.size)}</td>
                                    <td>
                                        {d.uploadedBy?.employeeName || "-"}
                                    </td>
                                    <td>
                                        {d.createdAt
                                            ? new Date(
                                                  d.createdAt,
                                              ).toLocaleString()
                                            : "-"}
                                    </td>
                                    <td>
                                        <div className="d-flex gap-2">
                                            <a
                                                href={buildDownloadUrl(
                                                    d.filePath,
                                                )}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="btn btn-sm btn-info"
                                            >
                                                Download
                                            </a>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-danger"
                                                onClick={() =>
                                                    handleDelete(d._id)
                                                }
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>
            </CardBody>
        </Card>
    );
};

export default DocumentsTab;
