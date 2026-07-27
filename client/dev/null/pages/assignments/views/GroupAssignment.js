"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../css/GroupAssignment.css";
import GroupInvoicePreviewModal from "./GroupInvoicePreviewModal";
import {
  fetchGroupForAssignment,
  fetchSubbies,
  fetchTruckRegNums,
  fetchRouteOptions,
  assignSubbie,
  finaliseGroup,
  fetchInstructionDocuments,
  uploadInstructionDocument,
  deleteInstructionDocument
} from "../../../services/assignmentService";
const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
const emptySelection = { subbieId: "", truck: "", startingpoint: "", destination: "", legDate: today, driverrate: null };
const GroupAssignment = ({ viewOnly = false, backRoute = "/instructions" } = {}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const groupId = location.state?.groupId;
  const listState = location.state || {};
  const [group, setGroup] = useState(null);
  const [children, setChildren] = useState([]);
  const [current, setCurrent] = useState(0);
  const [subbies, setSubbies] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [startingPoints, setStartingPoints] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selections, setSelections] = useState({});
  const [docsByChild, setDocsByChild] = useState({});
  const [openInfo, setOpenInfo] = useState(false);
  const [openContainers, setOpenContainers] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [finalising, setFinalising] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const fileInputRef = useRef(null);
  const readOnly = viewOnly || group?.status === "Completed";
  const loadGroup = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchGroupForAssignment(groupId);
      setGroup(data);
      const kids = data.instructions || [];
      setChildren(kids);
      const sel2 = {};
      const docs2 = {};
      kids.forEach((c) => {
        sel2[c.m1key] = {
          subbieId: c.assignment?.subbieId ? String(c.assignment.subbieId) : "",
          truck: c.assignment?.truck || "",
          startingpoint: c.assignment?.startingpoint || "",
          destination: c.assignment?.destination || "",
          legDate: c.assignment?.legDate || today,
          driverrate: c.assignment?.driverrate ?? null
        };
        docs2[c.m1key] = c.documents || [];
      });
      setSelections(sel2);
      setDocsByChild(docs2);
      return data;
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Failed to load the group");
      return null;
    } finally {
      setLoading(false);
    }
  }, [groupId]);
  useEffect(() => {
    if (!groupId) {
      navigate(backRoute, { state: listState });
      return;
    }
    loadGroup();
    fetchSubbies().then((d) => setSubbies(Array.isArray(d) ? d : [])).catch(() => {
    });
    fetchTruckRegNums().then((d) => setTrucks(Array.isArray(d) ? d : [])).catch(() => {
    });
    fetchRouteOptions().then(({ startingPoints: sp, destinations: dest }) => {
      setStartingPoints(sp);
      setDestinations(dest);
    }).catch(() => {
    });
  }, [groupId]);
  const child = children[current] || null;
  const isBreakBulk = String(child?.shipment_type) === "4";
  const m1key = child?.m1key;
  const sel = m1key ? selections[m1key] || emptySelection : emptySelection;
  const docs = m1key ? docsByChild[m1key] || [] : [];
  const childComplete = (c) => {
    if (!c) return false;
    const s = selections[c.m1key] || {};
    const d = docsByChild[c.m1key] || [];
    return Boolean(s.subbieId && s.truck && s.startingpoint && s.destination && Number(s.driverrate) > 0 && d.length > 0);
  };
  const currentComplete = childComplete(child);
  const allComplete = children.length > 0 && children.every(childComplete);
  const persistAssignment = useCallback(
    async (next) => {
      const { subbieId, truck, startingpoint, destination, legDate } = next;
      if (!m1key || !subbieId || !truck || !startingpoint || !destination) return;
      try {
        setError("");
        const result = await assignSubbie(m1key, { subbieId, truck, startingpoint, destination, legDate });
        setSelections((prev) => ({
          ...prev,
          [m1key]: { ...prev[m1key], driverrate: result.driverrate }
        }));
        setNotice(`Assignment saved \u2014 subcontractor rate R${Number(result.driverrate).toFixed(2)}.`);
        setTimeout(() => setNotice(""), 2500);
      } catch (e) {
        setSelections((prev) => ({ ...prev, [m1key]: { ...prev[m1key], driverrate: null } }));
        setError(e.response?.data?.message || e.message || "Failed to save assignment");
      }
    },
    [m1key]
  );
  const updateSelection = (field, value) => {
    const next = { ...sel, [field]: value };
    setSelections((prev) => ({ ...prev, [m1key]: next }));
    persistAssignment(next);
  };
  const refreshDocs = useCallback(async () => {
    if (!m1key) return;
    try {
      const list = await fetchInstructionDocuments(m1key);
      setDocsByChild((prev) => ({
        ...prev,
        [m1key]: list.map((d) => ({ id: d.id, name: d.name, type: d.type, url: d.url }))
      }));
    } catch {
    }
  }, [m1key]);
  useEffect(() => {
    if (m1key) refreshDocs();
  }, [m1key]);
  const handleFiles = async (files) => {
    if (!m1key || !files || files.length === 0) return;
    try {
      setError("");
      for (const file of files) {
        await uploadInstructionDocument(m1key, file, file.name);
      }
      await refreshDocs();
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Failed to upload document");
    }
  };
  const handleRemoveDoc = async (docId) => {
    try {
      await deleteInstructionDocument(docId);
      await refreshDocs();
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Failed to remove document");
    }
  };
  const goNext = () => {
    if (current < children.length - 1 && (readOnly || currentComplete)) setCurrent((i) => i + 1);
  };
  const goTo = (i) => {
    if (readOnly || i <= current || childComplete(children[i - 1])) setCurrent(i);
  };
  const handleFinalise = async () => {
    setError("");
    setFinalising(true);
    try {
      const result = await finaliseGroup(groupId);
      setNotice(`Group finalised. Invoice ${result.invoiceNum} created.`);
      await loadGroup();
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Failed to finalise the group");
    } finally {
      setFinalising(false);
    }
  };
  if (loading && !group) {
    return /* @__PURE__ */ React.createElement("div", { className: "wb-assign-wrapper" }, /* @__PURE__ */ React.createElement("p", { style: { textAlign: "center", padding: 40 } }, "Loading assignments\u2026"));
  }
  if (error && !group) {
    return /* @__PURE__ */ React.createElement("div", { className: "wb-assign-wrapper" }, /* @__PURE__ */ React.createElement("div", { className: "wb-assign-inner" }, /* @__PURE__ */ React.createElement("div", { className: "wb-assign-alert err" }, error), /* @__PURE__ */ React.createElement("button", { className: "wb-assign-back", onClick: () => navigate(backRoute, { state: listState }) }, "Back")));
  }
  const info = child ? [
    ["Client", group?.client_name],
    ["Shipment Type", child.shipmenttype],
    ["Booking Ref", child.booking_ref],
    ["Client File Reference", child.clientFileRef],
    ["Company File Reference", child.ksmFileRef],
    ["Pickup", child.pickup],
    ["Drop-Off", child.dropoff],
    ["Vessel Name", child.vessel_name]
  ] : [];
  return /* @__PURE__ */ React.createElement("div", { className: "wb-assign-wrapper" }, /* @__PURE__ */ React.createElement("div", { className: "wb-assign-inner" }, /* @__PURE__ */ React.createElement("button", { className: "wb-assign-back", onClick: () => navigate(backRoute, { state: listState }) }, "Back"), error && /* @__PURE__ */ React.createElement("div", { className: "wb-assign-alert err" }, error), notice && /* @__PURE__ */ React.createElement("div", { className: "wb-assign-alert ok" }, notice), readOnly && /* @__PURE__ */ React.createElement("div", { className: "wb-assign-alert ok" }, group?.status === "Completed" ? "This group has been finalised and is read-only." : "Viewing this group's assignments in read-only mode.", group?.invoiceNum ? ` Invoice ${group.invoiceNum}.` : ""), /* @__PURE__ */ React.createElement("div", { className: "wb-assign-card" }, /* @__PURE__ */ React.createElement("h3", null, "Instructions", children.length > 0 && /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 400, color: "#667085", fontSize: 13 } }, "  ", "\u2014 Instruction ", current + 1, " of ", children.length)), /* @__PURE__ */ React.createElement("div", { className: "wb-accordion" }, /* @__PURE__ */ React.createElement("button", { className: "wb-accordion-head", onClick: () => setOpenInfo((o) => !o) }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("div", { className: "wb-accordion-title" }, "Instruction Information"), /* @__PURE__ */ React.createElement("div", { className: "wb-accordion-sub" }, "Client, shipment and reference details for this instruction.")), /* @__PURE__ */ React.createElement("span", { className: `wb-accordion-chevron ${openInfo ? "open" : ""}` }, "\u25BE")), openInfo && /* @__PURE__ */ React.createElement("div", { className: "wb-accordion-body" }, /* @__PURE__ */ React.createElement("div", { className: "wb-info-grid" }, info.map(([label, value]) => /* @__PURE__ */ React.createElement("div", { className: "wb-info-item", key: label }, /* @__PURE__ */ React.createElement("div", { className: "wb-info-label" }, label), /* @__PURE__ */ React.createElement("div", { className: "wb-info-value" }, value || "\u2014")))))), /* @__PURE__ */ React.createElement("div", { className: "wb-accordion" }, /* @__PURE__ */ React.createElement("button", { className: "wb-accordion-head", onClick: () => setOpenContainers((o) => !o) }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("div", { className: "wb-accordion-title" }, isBreakBulk ? "Weight Details" : "Containers"), /* @__PURE__ */ React.createElement("div", { className: "wb-accordion-sub" }, isBreakBulk ? "KSM DN, ticket and receipt book weight entries." : "Trailer quantities and container details.")), /* @__PURE__ */ React.createElement("span", { className: `wb-accordion-chevron ${openContainers ? "open" : ""}` }, "\u25BE")), openContainers && /* @__PURE__ */ React.createElement("div", { className: "wb-accordion-body" }, isBreakBulk ? /* @__PURE__ */ React.createElement("table", { className: "wb-assign-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "DN Number"), /* @__PURE__ */ React.createElement("th", null, "Ticket Number"), /* @__PURE__ */ React.createElement("th", null, "Receipt Book Number"), /* @__PURE__ */ React.createElement("th", null, "Weight", child?.rateweight ? ` (${child.rateweight})` : ""))), /* @__PURE__ */ React.createElement("tbody", null, (child?.weightRows || []).length === 0 ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 4, style: { color: "#98a2b3" } }, "No weight entries")) : child.weightRows.map((w) => /* @__PURE__ */ React.createElement("tr", { key: w.weight_pk }, /* @__PURE__ */ React.createElement("td", null, w.ksm_dm_no || "\u2014"), /* @__PURE__ */ React.createElement("td", null, w.ticket_no || "\u2014"), /* @__PURE__ */ React.createElement("td", null, w.receipt_book_no || "\u2014"), /* @__PURE__ */ React.createElement("td", null, w.weight ?? "\u2014"))))) : /* @__PURE__ */ React.createElement("table", { className: "wb-assign-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Container Type"), /* @__PURE__ */ React.createElement("th", null, "Container Number"), /* @__PURE__ */ React.createElement("th", null, "Weight"), /* @__PURE__ */ React.createElement("th", null, "Cargo Description"))), /* @__PURE__ */ React.createElement("tbody", null, (child?.containers || []).length === 0 ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 4, style: { color: "#98a2b3" } }, "No containers")) : child.containers.map((c) => /* @__PURE__ */ React.createElement("tr", { key: c.containerkey }, /* @__PURE__ */ React.createElement("td", null, c.container_type), /* @__PURE__ */ React.createElement("td", null, c.containernum || "\u2014"), /* @__PURE__ */ React.createElement("td", null, c.weight ?? "\u2014"), /* @__PURE__ */ React.createElement("td", null, c.cargo_description || "\u2014"))))))), /* @__PURE__ */ React.createElement("div", { className: "wb-assign-controls" }, /* @__PURE__ */ React.createElement("div", { className: "wb-assign-field" }, /* @__PURE__ */ React.createElement("label", null, "Route"), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: sel.startingpoint,
      disabled: readOnly,
      onChange: (e) => updateSelection("startingpoint", e.target.value)
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, "Select Route"),
    startingPoints.map((p) => /* @__PURE__ */ React.createElement("option", { key: p, value: p }, p))
  )), /* @__PURE__ */ React.createElement("div", { className: "wb-assign-field" }, /* @__PURE__ */ React.createElement("label", null, "Destination"), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: sel.destination,
      disabled: readOnly,
      onChange: (e) => updateSelection("destination", e.target.value)
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, "Select Destination"),
    destinations.map((d) => /* @__PURE__ */ React.createElement("option", { key: d, value: d }, d))
  )), /* @__PURE__ */ React.createElement("div", { className: "wb-assign-field" }, /* @__PURE__ */ React.createElement("label", null, "Date"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "date",
      value: sel.legDate || "",
      disabled: readOnly,
      onChange: (e) => updateSelection("legDate", e.target.value)
    }
  ))), /* @__PURE__ */ React.createElement("div", { className: "wb-assign-controls" }, /* @__PURE__ */ React.createElement("div", { className: "wb-assign-field" }, /* @__PURE__ */ React.createElement("label", null, "Select Subcontractor"), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: sel.subbieId,
      disabled: readOnly,
      onChange: (e) => updateSelection("subbieId", e.target.value)
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, "Select Subcontractor"),
    subbies.map((s) => /* @__PURE__ */ React.createElement("option", { key: s.userid, value: s.userid }, s.name, " ", s.surname))
  )), /* @__PURE__ */ React.createElement("div", { className: "wb-assign-field" }, /* @__PURE__ */ React.createElement("label", null, "Truck"), /* @__PURE__ */ React.createElement("select", { value: sel.truck, disabled: readOnly, onChange: (e) => updateSelection("truck", e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Truck"), trucks.map((t) => /* @__PURE__ */ React.createElement("option", { key: t, value: t }, t)))), /* @__PURE__ */ React.createElement("div", { className: "wb-assign-field" }, /* @__PURE__ */ React.createElement("label", null, "Subcontractor Rate"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      readOnly: true,
      value: Number(sel.driverrate) > 0 ? `R ${Number(sel.driverrate).toFixed(2)}` : "Not rated",
      title: "Resolved from the route, date and this instruction's container type"
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "wb-assign-spacer" }), /* @__PURE__ */ React.createElement(
    "button",
    {
      className: "wb-next-btn",
      onClick: goNext,
      disabled: current >= children.length - 1 || !readOnly && !currentComplete,
      title: !readOnly && !currentComplete ? "Set a route that resolves a rate, assign a subcontractor + truck and upload a document to continue" : ""
    },
    "Next \u2192"
  )), children.length > 1 && /* @__PURE__ */ React.createElement("div", { className: "wb-dots" }, children.map((c, i) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: c.m1key,
      className: `wb-dot ${i === current ? "active" : ""} ${childComplete(c) ? "complete" : ""}`,
      onClick: () => goTo(i),
      "aria-label": `Instruction ${i + 1}`
    }
  )))), /* @__PURE__ */ React.createElement("div", { className: "wb-assign-card" }, /* @__PURE__ */ React.createElement("div", { className: "wb-docs-head" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { style: { margin: 0 } }, "Documents"), /* @__PURE__ */ React.createElement("div", { className: "wb-docs-sub" }, "Upload PODs and any supporting documentation.")), !readOnly && /* @__PURE__ */ React.createElement("button", { className: "wb-upload-btn", onClick: () => fileInputRef.current?.click() }, "\u2B06 Upload Document")), /* @__PURE__ */ React.createElement(
    "input",
    {
      ref: fileInputRef,
      type: "file",
      multiple: true,
      accept: ".pdf,.png,.jpg,.jpeg",
      style: { display: "none" },
      onChange: (e) => handleFiles(Array.from(e.target.files || []))
    }
  ), !readOnly && /* @__PURE__ */ React.createElement(
    "div",
    {
      className: `wb-dropzone ${dragging ? "drag" : ""}`,
      onClick: () => fileInputRef.current?.click(),
      onDragOver: (e) => {
        e.preventDefault();
        setDragging(true);
      },
      onDragLeave: () => setDragging(false),
      onDrop: (e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(Array.from(e.dataTransfer.files || []));
      }
    },
    /* @__PURE__ */ React.createElement("div", { style: { fontSize: 22 } }, "\u2B06"),
    /* @__PURE__ */ React.createElement("div", { className: "wb-drop-main" }, "Drop files here or click to upload"),
    /* @__PURE__ */ React.createElement("div", { className: "wb-drop-sub" }, "PDF, PNG or JPG up to 10MB")
  ), docs.length === 0 && readOnly && /* @__PURE__ */ React.createElement("div", { className: "wb-drop-sub", style: { padding: "10px 0" } }, "No documents uploaded."), docs.map((d) => /* @__PURE__ */ React.createElement("div", { className: "wb-doc-row", key: d.id }, /* @__PURE__ */ React.createElement("div", { className: "wb-doc-icon" }, "\u{1F4CE}"), /* @__PURE__ */ React.createElement("div", { className: "wb-doc-meta" }, d.url ? /* @__PURE__ */ React.createElement(
    "a",
    {
      className: "wb-doc-name wb-doc-link",
      href: d.url,
      target: "_blank",
      rel: "noopener noreferrer"
    },
    d.name
  ) : /* @__PURE__ */ React.createElement("div", { className: "wb-doc-name" }, d.name), /* @__PURE__ */ React.createElement("div", { className: "wb-doc-sub" }, d.type || "Instruction Document")), d.url && /* @__PURE__ */ React.createElement(
    "a",
    {
      className: "wb-doc-view",
      href: d.url,
      target: "_blank",
      rel: "noopener noreferrer",
      title: "Open document"
    },
    "View"
  ), /* @__PURE__ */ React.createElement("span", { className: "wb-doc-check" }, "\u2713"), !readOnly && /* @__PURE__ */ React.createElement("button", { className: "wb-doc-remove", onClick: () => handleRemoveDoc(d.id), "aria-label": "Remove" }, "\u2715")))), /* @__PURE__ */ React.createElement("div", { className: "wb-assign-actions" }, !readOnly && /* @__PURE__ */ React.createElement("button", { className: "wb-btn-outline", onClick: loadGroup }, "\u27F3 Save Changes"), /* @__PURE__ */ React.createElement("button", { className: "wb-btn-outline", onClick: () => setShowInvoice(true) }, "\u{1F9FE} Preview Invoice"), !readOnly && /* @__PURE__ */ React.createElement(
    "button",
    {
      className: "wb-btn-finalise",
      disabled: !allComplete || finalising,
      onClick: handleFinalise,
      title: !allComplete ? "Complete every instruction first" : ""
    },
    finalising ? "Finalising\u2026" : "\u2713 Finalise Instruction"
  ))), /* @__PURE__ */ React.createElement(
    GroupInvoicePreviewModal,
    {
      groupId,
      isOpen: showInvoice,
      onClose: () => setShowInvoice(false)
    }
  ));
};
export default GroupAssignment;
