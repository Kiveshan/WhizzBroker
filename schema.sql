--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: add_ons_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.add_ons_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: add_ons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.add_ons (
    addon_id integer DEFAULT nextval('public.add_ons_id_seq'::regclass) NOT NULL,
    client_id integer,
    amount double precision,
    date date,
    invoice_number character varying,
    created_at date,
    group_id character varying,
    items jsonb,
    vat_applied boolean DEFAULT true,
    booking_ref character varying(50),
    client_ref character varying(50),
    paid_amount numeric(12,2) DEFAULT 0,
    status character varying(20) DEFAULT 'unpaid'::character varying,
    vessel_number character varying
);


--
-- Name: aging_analysis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aging_analysis (
    aging_key integer NOT NULL,
    clientid integer NOT NULL,
    current numeric,
    "30days" numeric,
    "60days" numeric,
    "90days" numeric
);


--
-- Name: aging_analysis_aging_key_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.aging_analysis_aging_key_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: aging_analysis_aging_key_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.aging_analysis_aging_key_seq OWNED BY public.aging_analysis.aging_key;


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id integer NOT NULL,
    action_type character varying(100) NOT NULL,
    admin_id integer,
    target_employee_id integer,
    target_employee_name character varying(255),
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    details text,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now(),
    entity_type text
);


--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
-- Name: base_salary_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.base_salary_history (
    id integer NOT NULL,
    userid integer,
    base double precision,
    date date
);


--
-- Name: base_salary_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.base_salary_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;


--
-- Name: base_salary_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.base_salary_history_id_seq OWNED BY public.base_salary_history.id;


--
-- Name: container; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.container (
    containerkey integer NOT NULL,
    containernum character varying(20),
    weight double precision,
    m1key integer,
    container_type text,
    cargo_description text,
    "Add Surcharges" boolean,
    "Hazardous" boolean,
    "Surcharge Amount" double precision,
    "Hazardous Amount" double precision,
    file_ref character varying,
    "vgm amount" double precision,
    vgm boolean,
    is_12m_surcharge boolean DEFAULT false NOT NULL,
    surcharge_12m_amount numeric(12,2) DEFAULT 0 NOT NULL
);


--
-- Name: container_containerkey_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.container_containerkey_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: container_containerkey_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.container_containerkey_seq OWNED BY public.container.containerkey;


--
-- Name: credit_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_notes (
    creditnote_id integer NOT NULL,
    client_id integer NOT NULL,
    creditnote_date date DEFAULT CURRENT_DATE NOT NULL,
    amount double precision[] NOT NULL,
    containerids integer[] NOT NULL,
    doc_no character varying(50),
    m1key integer,
    description text,
    account_no character varying(50),
    vat double precision,
    CONSTRAINT credit_notes_amount_array_check CHECK (((array_length(amount, 1) IS NOT NULL) AND (array_position(amount, NULL::double precision) IS NULL)))
);


--
-- Name: credit_notes_creditnote_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.credit_notes ALTER COLUMN creditnote_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.credit_notes_creditnote_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    document_id integer NOT NULL,
    name text,
    type text,
    leg_number integer,
    s3key text,
    upload_date date,
    m1key integer,
    client integer,
    url text
);


--
-- Name: documents_document_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.documents_document_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: documents_document_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.documents_document_id_seq OWNED BY public.documents.document_id;


--
-- Name: employee_deduction_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_deduction_history (
    history_id integer NOT NULL,
    employeeid integer NOT NULL,
    effective_date date NOT NULL,
    income_tax_rate double precision,
    deduction_income_tax double precision,
    deduction_other_deductions double precision,
    deduction_uif double precision,
    deduction_bonus double precision,
    deduction_savings double precision,
    deduction_loan double precision,
    deduction_damage double precision
);


--
-- Name: employee_deduction_history_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.employee_deduction_history ALTER COLUMN history_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.employee_deduction_history_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: expense_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_types (
    id integer NOT NULL,
    expense text NOT NULL
);


--
-- Name: expense_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.expense_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: expense_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.expense_types_id_seq OWNED BY public.expense_types.id;


--
-- Name: expenses_m2; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses_m2 (
    ekey integer NOT NULL,
    type text,
    documentfrom text,
    expensecost double precision,
    description text,
    slipname text,
    slipuploaddate date,
    truckid integer,
    driverid integer,
    slipurl text,
    s3key text,
    orderno character varying
);


--
-- Name: expenses_m2_ekey_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.expenses_m2_ekey_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: expenses_m2_ekey_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.expenses_m2_ekey_seq OWNED BY public.expenses_m2.ekey;


--
-- Name: invoice; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice (
    ikey integer NOT NULL,
    clientid integer,
    m1key integer,
    invoice_num text,
    doc_num text,
    groupid character varying(20),
    date date,
    additional_destination_info character varying
);


--
-- Name: invoice_ikey_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.invoice_ikey_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invoice_ikey_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.invoice_ikey_seq OWNED BY public.invoice.ikey;


--
-- Name: legs_m2; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legs_m2 (
    legkey integer NOT NULL,
    legnumber integer,
    driverid integer,
    truckregnumber character varying(20),
    containernumber character varying(20),
    date date,
    startingpoint text,
    destination text,
    driverrate double precision,
    vgm double precision,
    legstatus text,
    documentname text,
    documenttype text,
    documentuploaddate date,
    m1key integer,
    m5ratekey integer,
    dn text
);


--
-- Name: legs_m2_legkey_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.legs_m2_legkey_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: legs_m2_legkey_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.legs_m2_legkey_seq OWNED BY public.legs_m2.legkey;


--
-- Name: m1_controller; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.m1_controller (
    m1key integer NOT NULL,
    client integer,
    "ksmFileRef" text,
    shipment_type integer,
    pickup text,
    dropoff text,
    stackdate date,
    "lastFreeDate" date,
    "clientFileRef" text,
    rateweight text,
    description character varying(225),
    status text,
    vat integer,
    num_six_meters integer,
    num_twelve_meters integer,
    num_abnormal integer,
    total_cost double precision,
    weight double precision,
    booking_ref text,
    vessel_name text,
    rateper_6 double precision,
    rateper_12 double precision,
    rateper_abnormal double precision,
    surcharge double precision,
    unitrate double precision,
    num_breakbulk integer,
    rateper_breakbulk double precision,
    created_at date,
    paid_amount numeric(12,2) DEFAULT 0,
    payment_status character varying(20) DEFAULT 'unpaid'::character varying,
    is_set_rate boolean DEFAULT false NOT NULL,
    historical_set_rate numeric(10,2),
    addon_id integer
);


--
-- Name: m1_controller_m1key_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.m1_controller_m1key_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: m1_controller_m1key_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.m1_controller_m1key_seq OWNED BY public.m1_controller.m1key;


--
-- Name: m1_controller_weight; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.m1_controller_weight (
    weight_pk integer NOT NULL,
    m1_key integer,
    ksm_dm_no character varying,
    ticket_no character varying,
    receipt_book_no character varying,
    weight double precision
);


--
-- Name: m1_controller_weight_weight_pk_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.m1_controller_weight ALTER COLUMN weight_pk ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.m1_controller_weight_weight_pk_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: m5_client; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.m5_client (
    m5clientkey integer NOT NULL,
    client text,
    representative text,
    companyaddress text,
    suburb text,
    postalcode text,
    email text,
    client_reg_num character varying(100),
    cellnum character varying(10),
    vatregno character varying(20),
    city text,
    streetaddress text,
    payment_type text,
    status boolean DEFAULT true NOT NULL,
    starting_point character varying(250),
    destination character varying(250),
    driver_six_meter_rate double precision,
    driver_twelve_meter_rate double precision,
    insurance numeric(12,2),
    CONSTRAINT m5_client_insurance_check CHECK (((insurance IS NULL) OR (insurance >= (0)::numeric)))
);


--
-- Name: m5_client_m5clientkey_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.m5_client_m5clientkey_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: m5_client_m5clientkey_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.m5_client_m5clientkey_seq OWNED BY public.m5_client.m5clientkey;


--
-- Name: m5_client_rate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.m5_client_rate (
    client_rate_id integer NOT NULL,
    starting_point character varying,
    destination character varying,
    "6m_rate" double precision,
    "12m_rate" double precision,
    surcharges double precision,
    clientid integer,
    hazardous double precision,
    vgm double precision,
    set_rate double precision,
    surcharge12m double precision,
    fuel_surcharge numeric
);


--
-- Name: m5_client_rate_client_rate_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.m5_client_rate_client_rate_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: m5_client_rate_client_rate_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.m5_client_rate_client_rate_id_seq OWNED BY public.m5_client_rate.client_rate_id;


--
-- Name: m5_driver_rate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.m5_driver_rate (
    m5ratekey integer NOT NULL,
    startingpoint text,
    destination text,
    driverid integer,
    subie_rate double precision,
    driver_six_meter_rate double precision,
    driver_twelve_meter_rate double precision,
    subie_six_meter_rate double precision,
    subie_twelve_meter_rate double precision,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    effective_from date DEFAULT '2020-01-01'::date NOT NULL,
    effective_to date
);


--
-- Name: m5_driver_rate_m5ratekey_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.m5_driver_rate_m5ratekey_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: m5_driver_rate_m5ratekey_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.m5_driver_rate_m5ratekey_seq OWNED BY public.m5_driver_rate.m5ratekey;


--
-- Name: m5_employee; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.m5_employee (
    userid integer NOT NULL,
    name text,
    surname text,
    telephonenum character varying(10),
    cellnum character varying(10),
    employeenum character varying(20),
    roleid integer,
    email text,
    password text,
    base_salary double precision,
    companyname text,
    location text,
    truckregnum text,
    contact_person character varying(25),
    subei_reg_num character varying(20),
    no_of_trucks integer,
    status boolean,
    company_reg_num character varying(20),
    subdrivername text[],
    income_tax_rate double precision,
    deduction_income_tax double precision,
    deduction_other_deductions double precision,
    deduction_uif double precision,
    deduction_bonus double precision,
    deduction_savings double precision,
    deduction_loan double precision,
    deduction_damage double precision,
    loan_amount double precision,
    deduction_date date,
    document_url1 character varying,
    document_url2 character varying,
    document_url3 character varying,
    driverstatus boolean DEFAULT false
);


--
-- Name: m5_merged_userid_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.m5_merged_userid_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: m5_merged_userid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.m5_merged_userid_seq OWNED BY public.m5_employee.userid;


--
-- Name: m5_trailers_m5trailerskey_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.m5_trailers_m5trailerskey_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;


--
-- Name: m5_trailers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.m5_trailers (
    m5trailerskey integer DEFAULT nextval('public.m5_trailers_m5trailerskey_seq'::regclass) NOT NULL,
    trailerregnum character varying(20),
    trailersize character varying(20),
    trailerpurchasedate date,
    year integer,
    model character varying(50),
    purchase_price double precision,
    current_evaluation character varying(20),
    vin_num character varying(255),
    document_url1 character varying,
    document_url2 character varying,
    document_url3 character varying,
    trailer_license_expiry date,
    status boolean DEFAULT true
);


--
-- Name: COLUMN m5_trailers.trailer_license_expiry; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.m5_trailers.trailer_license_expiry IS 'Date when the trailer license expires - used for 30-day expiry notifications';


--
-- Name: COLUMN m5_trailers.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.m5_trailers.status IS 'Trailer status: true = enabled, false = disabled';


--
-- Name: m5_trucks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.m5_trucks (
    m5truckskey integer NOT NULL,
    truckregnum character varying(20),
    trailersize character varying(20),
    truckpurchasedate date,
    year integer,
    model character varying(50),
    purchase_price double precision,
    current_evaluation character varying(20),
    vin_num character varying(20),
    is_subcontractor boolean,
    document_url1 character varying,
    document_url2 character varying,
    document_url3 character varying,
    truck_license_expiry date,
    subei_reg_num character varying(250),
    git character varying(255),
    status boolean DEFAULT true
);


--
-- Name: COLUMN m5_trucks.truck_license_expiry; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.m5_trucks.truck_license_expiry IS 'Date when the truck license expires - used for 30-day expiry notifications';


--
-- Name: COLUMN m5_trucks.subei_reg_num; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.m5_trucks.subei_reg_num IS 'Reference to subcontractor registration number when is_subcontractor is true';


--
-- Name: COLUMN m5_trucks.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.m5_trucks.status IS 'Truck status: true = active, false = disabled';


--
-- Name: m5_trucks_m5truckskey_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.m5_trucks_m5truckskey_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: m5_trucks_m5truckskey_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.m5_trucks_m5truckskey_seq OWNED BY public.m5_trucks.m5truckskey;


--
-- Name: payment_m3; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_m3 (
    paykey integer NOT NULL,
    amount double precision,
    filename text,
    fileupload date,
    clientid integer,
    invoiceid integer,
    reference character varying,
    addon_id integer,
    line_items jsonb
);


--
-- Name: payment_m3_paykey_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payment_m3_paykey_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payment_m3_paykey_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payment_m3_paykey_seq OWNED BY public.payment_m3.paykey;


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_orders (
    po_id integer NOT NULL,
    supplier_id integer NOT NULL,
    reg_no text,
    attention_to text,
    received_by text,
    quantity integer NOT NULL,
    unit_price double precision NOT NULL,
    description text,
    subbie text,
    date date,
    ponum text,
    total double precision,
    expense_type_id integer,
    orderno character varying,
    slip_s3key text,
    invoice_number character varying,
    truckid integer,
    vat double precision
);


--
-- Name: purchase_orders_po_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_orders_po_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_orders_po_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_orders_po_id_seq OWNED BY public.purchase_orders.po_id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    roleid integer NOT NULL,
    rolename text NOT NULL
);


--
-- Name: roles_roleid_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_roleid_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_roleid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_roleid_seq OWNED BY public.roles.roleid;


--
-- Name: shipment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipment (
    shipkey integer NOT NULL,
    shipmenttype text NOT NULL
);


--
-- Name: shipment_shipkey_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.shipment_shipkey_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: shipment_shipkey_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.shipment_shipkey_seq OWNED BY public.shipment.shipkey;


--
-- Name: statements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.statements (
    statement_key integer NOT NULL,
    groupid character varying(20),
    generation_date date DEFAULT CURRENT_DATE,
    clientid integer,
    agingid integer,
    opening_balance numeric,
    insurance_amount numeric(12,2) DEFAULT 0
);


--
-- Name: statements_statement_key_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.statements_statement_key_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: statements_statement_key_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.statements_statement_key_seq OWNED BY public.statements.statement_key;


--
-- Name: subcontractor_statements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subcontractor_statements (
    sub_state_id integer NOT NULL,
    subbie_reg_num character varying,
    date date,
    amount numeric,
    legids json,
    vat_status character varying DEFAULT 'VAT'::character varying
);


--
-- Name: subcontractor_statements_sub_state_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subcontractor_statements_sub_state_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subcontractor_statements_sub_state_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subcontractor_statements_sub_state_id_seq OWNED BY public.subcontractor_statements.sub_state_id;


--
-- Name: supplier_expense_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_expense_types (
    se_id integer NOT NULL,
    expense_type_id integer NOT NULL
);


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    supplier_id integer NOT NULL,
    supplier text NOT NULL,
    representative text NOT NULL,
    address text,
    suburb text,
    postalcode text,
    email text,
    cellnum character varying(20),
    vatregno character varying(20),
    city text,
    streetaddress text,
    payment_type text,
    status boolean DEFAULT true NOT NULL
);


--
-- Name: suppliers_supplier_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.suppliers_supplier_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: suppliers_supplier_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.suppliers_supplier_id_seq OWNED BY public.suppliers.supplier_id;


--
-- Name: tax_deductions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tax_deductions (
    id integer NOT NULL,
    remuneration_lower double precision NOT NULL,
    remuneration_upper double precision NOT NULL,
    tax double precision NOT NULL,
    effective_date date
);


--
-- Name: tax_deductions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tax_deductions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tax_deductions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tax_deductions_id_seq OWNED BY public.tax_deductions.id;


--
-- Name: usertable; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usertable (
    userid integer NOT NULL,
    name text,
    surname text,
    email text,
    password text,
    companyname text,
    dateofreg date,
    status text,
    roleid integer,
    company_reg_num character varying(20),
    cluster_box text,
    cell_num character varying(10),
    cell_num2 character varying(10),
    vat_reg_num character varying(20),
    account_num text,
    name_of_acc text,
    bank text,
    branch text,
    branch_code text,
    address text,
    suburb text,
    swift_code character varying(11)
);


--
-- Name: usertable_userid_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usertable_userid_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usertable_userid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usertable_userid_seq OWNED BY public.usertable.userid;


--
-- Name: wages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wages (
    wageskey integer NOT NULL,
    salary_hours integer,
    salary_rate double precision,
    salary_total double precision,
    overtime_hours integer,
    overtime_rate double precision,
    overtime_total double precision,
    public_holidays_days integer,
    public_holidays_rate double precision,
    public_holidays_total double precision,
    allowance_rate double precision,
    allowance_total double precision,
    short_pay_rate double precision,
    short_pay_total double precision,
    total_earnings double precision,
    total_deductions double precision,
    net_pay double precision,
    employeeid integer,
    employee_date date,
    employerid integer,
    employer_date date
);


--
-- Name: wages_wageskey_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.wages_wageskey_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: wages_wageskey_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.wages_wageskey_seq OWNED BY public.wages.wageskey;


--
-- Name: aging_analysis aging_key; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aging_analysis ALTER COLUMN aging_key SET DEFAULT nextval('public.aging_analysis_aging_key_seq'::regclass);


--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- Name: base_salary_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.base_salary_history ALTER COLUMN id SET DEFAULT nextval('public.base_salary_history_id_seq'::regclass);


--
-- Name: container containerkey; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.container ALTER COLUMN containerkey SET DEFAULT nextval('public.container_containerkey_seq'::regclass);


--
-- Name: documents document_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents ALTER COLUMN document_id SET DEFAULT nextval('public.documents_document_id_seq'::regclass);


--
-- Name: expense_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_types ALTER COLUMN id SET DEFAULT nextval('public.expense_types_id_seq'::regclass);


--
-- Name: expenses_m2 ekey; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses_m2 ALTER COLUMN ekey SET DEFAULT nextval('public.expenses_m2_ekey_seq'::regclass);


--
-- Name: invoice ikey; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice ALTER COLUMN ikey SET DEFAULT nextval('public.invoice_ikey_seq'::regclass);


--
-- Name: legs_m2 legkey; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legs_m2 ALTER COLUMN legkey SET DEFAULT nextval('public.legs_m2_legkey_seq'::regclass);


--
-- Name: m1_controller m1key; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m1_controller ALTER COLUMN m1key SET DEFAULT nextval('public.m1_controller_m1key_seq'::regclass);


--
-- Name: m5_client m5clientkey; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m5_client ALTER COLUMN m5clientkey SET DEFAULT nextval('public.m5_client_m5clientkey_seq'::regclass);


--
-- Name: m5_client_rate client_rate_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m5_client_rate ALTER COLUMN client_rate_id SET DEFAULT nextval('public.m5_client_rate_client_rate_id_seq'::regclass);


--
-- Name: m5_driver_rate m5ratekey; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m5_driver_rate ALTER COLUMN m5ratekey SET DEFAULT nextval('public.m5_driver_rate_m5ratekey_seq'::regclass);


--
-- Name: m5_employee userid; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m5_employee ALTER COLUMN userid SET DEFAULT nextval('public.m5_merged_userid_seq'::regclass);


--
-- Name: m5_trucks m5truckskey; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m5_trucks ALTER COLUMN m5truckskey SET DEFAULT nextval('public.m5_trucks_m5truckskey_seq'::regclass);


--
-- Name: payment_m3 paykey; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_m3 ALTER COLUMN paykey SET DEFAULT nextval('public.payment_m3_paykey_seq'::regclass);


--
-- Name: purchase_orders po_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders ALTER COLUMN po_id SET DEFAULT nextval('public.purchase_orders_po_id_seq'::regclass);


--
-- Name: roles roleid; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN roleid SET DEFAULT nextval('public.roles_roleid_seq'::regclass);


--
-- Name: shipment shipkey; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment ALTER COLUMN shipkey SET DEFAULT nextval('public.shipment_shipkey_seq'::regclass);


--
-- Name: statements statement_key; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.statements ALTER COLUMN statement_key SET DEFAULT nextval('public.statements_statement_key_seq'::regclass);


--
-- Name: subcontractor_statements sub_state_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcontractor_statements ALTER COLUMN sub_state_id SET DEFAULT nextval('public.subcontractor_statements_sub_state_id_seq'::regclass);


--
-- Name: suppliers supplier_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN supplier_id SET DEFAULT nextval('public.suppliers_supplier_id_seq'::regclass);


--
-- Name: tax_deductions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_deductions ALTER COLUMN id SET DEFAULT nextval('public.tax_deductions_id_seq'::regclass);


--
-- Name: usertable userid; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usertable ALTER COLUMN userid SET DEFAULT nextval('public.usertable_userid_seq'::regclass);


--
-- Name: wages wageskey; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wages ALTER COLUMN wageskey SET DEFAULT nextval('public.wages_wageskey_seq'::regclass);


--
-- Name: add_ons add_ons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.add_ons
    ADD CONSTRAINT add_ons_pkey PRIMARY KEY (addon_id);


--
-- Name: aging_analysis aging_analysis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aging_analysis
    ADD CONSTRAINT aging_analysis_pkey PRIMARY KEY (aging_key);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: base_salary_history base_salary_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.base_salary_history
    ADD CONSTRAINT base_salary_history_pkey PRIMARY KEY (id);


--
-- Name: container container_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.container
    ADD CONSTRAINT container_pkey PRIMARY KEY (containerkey);


--
-- Name: credit_notes credit_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT credit_notes_pkey PRIMARY KEY (creditnote_id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (document_id);


--
-- Name: employee_deduction_history employee_deduction_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_deduction_history
    ADD CONSTRAINT employee_deduction_history_pkey PRIMARY KEY (history_id);


--
-- Name: expense_types expense_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_types
    ADD CONSTRAINT expense_types_name_key UNIQUE (expense);


--
-- Name: expense_types expense_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_types
    ADD CONSTRAINT expense_types_pkey PRIMARY KEY (id);


--
-- Name: expenses_m2 expenses_m2_orderno_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses_m2
    ADD CONSTRAINT expenses_m2_orderno_unique UNIQUE (orderno);


--
-- Name: expenses_m2 expenses_m2_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses_m2
    ADD CONSTRAINT expenses_m2_pkey PRIMARY KEY (ekey);


--
-- Name: invoice invoice_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT invoice_pkey PRIMARY KEY (ikey);


--
-- Name: legs_m2 legs_m2_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legs_m2
    ADD CONSTRAINT legs_m2_pkey PRIMARY KEY (legkey);


--
-- Name: legs_m2 legs_m2_unique_assignment; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legs_m2
    ADD CONSTRAINT legs_m2_unique_assignment UNIQUE (m1key, legnumber, driverid, truckregnumber, containernumber, vgm, date);


--
-- Name: m1_controller m1_controller_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m1_controller
    ADD CONSTRAINT m1_controller_pkey PRIMARY KEY (m1key);


--
-- Name: m1_controller_weight m1_controller_weight_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m1_controller_weight
    ADD CONSTRAINT m1_controller_weight_pkey PRIMARY KEY (weight_pk);


--
-- Name: m5_client m5_client_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m5_client
    ADD CONSTRAINT m5_client_pkey PRIMARY KEY (m5clientkey);


--
-- Name: m5_client_rate m5_client_rate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m5_client_rate
    ADD CONSTRAINT m5_client_rate_pkey PRIMARY KEY (client_rate_id);


--
-- Name: m5_driver_rate m5_driver_rate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m5_driver_rate
    ADD CONSTRAINT m5_driver_rate_pkey PRIMARY KEY (m5ratekey);


--
-- Name: m5_employee m5_merged_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m5_employee
    ADD CONSTRAINT m5_merged_pkey PRIMARY KEY (userid);


--
-- Name: m5_trailers m5_trailers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m5_trailers
    ADD CONSTRAINT m5_trailers_pkey PRIMARY KEY (m5trailerskey);


--
-- Name: m5_trucks m5_trucks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m5_trucks
    ADD CONSTRAINT m5_trucks_pkey PRIMARY KEY (m5truckskey);


--
-- Name: payment_m3 payment_m3_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_m3
    ADD CONSTRAINT payment_m3_pkey PRIMARY KEY (paykey);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (po_id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (roleid);


--
-- Name: roles roles_rolename_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_rolename_key UNIQUE (rolename);


--
-- Name: shipment shipment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment
    ADD CONSTRAINT shipment_pkey PRIMARY KEY (shipkey);


--
-- Name: shipment shipment_shipmenttype_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment
    ADD CONSTRAINT shipment_shipmenttype_key UNIQUE (shipmenttype);


--
-- Name: statements statements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.statements
    ADD CONSTRAINT statements_pkey PRIMARY KEY (statement_key);


--
-- Name: subcontractor_statements subcontractor_statements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcontractor_statements
    ADD CONSTRAINT subcontractor_statements_pkey PRIMARY KEY (sub_state_id);


--
-- Name: supplier_expense_types supplier_expense_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_expense_types
    ADD CONSTRAINT supplier_expense_types_pkey PRIMARY KEY (se_id, expense_type_id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (supplier_id);


--
-- Name: tax_deductions tax_deductions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_deductions
    ADD CONSTRAINT tax_deductions_pkey PRIMARY KEY (id);


--
-- Name: wages unique_wage_per_employee_month_year; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wages
    ADD CONSTRAINT unique_wage_per_employee_month_year UNIQUE (employeeid, employee_date);


--
-- Name: usertable usertable_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usertable
    ADD CONSTRAINT usertable_email_key UNIQUE (email);


--
-- Name: usertable usertable_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usertable
    ADD CONSTRAINT usertable_pkey PRIMARY KEY (userid);


--
-- Name: wages wages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wages
    ADD CONSTRAINT wages_pkey PRIMARY KEY (wageskey);


--
-- Name: idx_add_ons_client_refs; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_add_ons_client_refs ON public.add_ons USING btree (client_id, booking_ref, client_ref);


--
-- Name: idx_audit_log_action_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_action_type ON public.audit_log USING btree (action_type);


--
-- Name: idx_audit_log_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_timestamp ON public.audit_log USING btree ("timestamp");


--
-- Name: idx_container_m1key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_container_m1key ON public.container USING btree (m1key);


--
-- Name: idx_documents_m1key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_m1key ON public.documents USING btree (m1key);


--
-- Name: idx_driver_rate_effective_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_driver_rate_effective_dates ON public.m5_driver_rate USING btree (startingpoint, destination, effective_from);


--
-- Name: idx_employee_deduction_history_employee_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_deduction_history_employee_date ON public.employee_deduction_history USING btree (employeeid, effective_date);


--
-- Name: idx_invoice_clientid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_clientid ON public.invoice USING btree (clientid);


--
-- Name: idx_invoice_m1key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_m1key ON public.invoice USING btree (m1key);


--
-- Name: idx_m1_controller_addon_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_m1_controller_addon_id_unique ON public.m1_controller USING btree (addon_id) WHERE (addon_id IS NOT NULL);


--
-- Name: idx_m5_trucks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m5_trucks_status ON public.m5_trucks USING btree (status);


--
-- Name: idx_payment_m3_clientid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_m3_clientid ON public.payment_m3 USING btree (clientid);


--
-- Name: idx_trailer_license_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trailer_license_expiry ON public.m5_trailers USING btree (trailer_license_expiry) WHERE (trailer_license_expiry IS NOT NULL);


--
-- Name: idx_truck_license_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_truck_license_expiry ON public.m5_trucks USING btree (truck_license_expiry) WHERE (truck_license_expiry IS NOT NULL);


--
-- Name: uniq_m5_employee_login_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_m5_employee_login_email ON public.m5_employee USING btree (email) WHERE ((email IS NOT NULL) AND (email <> ''::text) AND (password IS NOT NULL) AND (password <> ''::text));


--
-- Name: statements agingid; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.statements
    ADD CONSTRAINT agingid FOREIGN KEY (agingid) REFERENCES public.aging_analysis(aging_key) ON UPDATE CASCADE;


--
-- Name: aging_analysis clientid; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aging_analysis
    ADD CONSTRAINT clientid FOREIGN KEY (clientid) REFERENCES public.m5_client(m5clientkey) ON UPDATE CASCADE;


--
-- Name: m5_client_rate clientid; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m5_client_rate
    ADD CONSTRAINT clientid FOREIGN KEY (clientid) REFERENCES public.m5_client(m5clientkey) NOT VALID;


--
-- Name: container container_m1key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.container
    ADD CONSTRAINT container_m1key_fkey FOREIGN KEY (m1key) REFERENCES public.m1_controller(m1key) ON DELETE CASCADE;


--
-- Name: documents documents_client_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_client_fkey FOREIGN KEY (client) REFERENCES public.m5_client(m5clientkey) ON DELETE CASCADE;


--
-- Name: documents documents_m1key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_m1key_fkey FOREIGN KEY (m1key) REFERENCES public.m1_controller(m1key) ON DELETE CASCADE;


--
-- Name: base_salary_history employeeid; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.base_salary_history
    ADD CONSTRAINT employeeid FOREIGN KEY (userid) REFERENCES public.m5_employee(userid);


--
-- Name: add_ons fk_client; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.add_ons
    ADD CONSTRAINT fk_client FOREIGN KEY (client_id) REFERENCES public.m5_client(m5clientkey);


--
-- Name: credit_notes fk_credit_notes_client_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT fk_credit_notes_client_id FOREIGN KEY (client_id) REFERENCES public.m5_client(m5clientkey) ON DELETE RESTRICT;


--
-- Name: credit_notes fk_credit_notes_m1key; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT fk_credit_notes_m1key FOREIGN KEY (m1key) REFERENCES public.m1_controller(m1key) ON DELETE RESTRICT;


--
-- Name: employee_deduction_history fk_employee_history; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_deduction_history
    ADD CONSTRAINT fk_employee_history FOREIGN KEY (employeeid) REFERENCES public.m5_employee(userid) ON DELETE CASCADE;


--
-- Name: m5_employee fk_employee_role; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m5_employee
    ADD CONSTRAINT fk_employee_role FOREIGN KEY (roleid) REFERENCES public.roles(roleid) ON DELETE SET NULL;


--
-- Name: expenses_m2 fk_expenses_driver; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses_m2
    ADD CONSTRAINT fk_expenses_driver FOREIGN KEY (driverid) REFERENCES public.m5_employee(userid) ON DELETE SET NULL;


--
-- Name: expenses_m2 fk_expenses_truck; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses_m2
    ADD CONSTRAINT fk_expenses_truck FOREIGN KEY (truckid) REFERENCES public.m5_trucks(m5truckskey) ON DELETE SET NULL;


--
-- Name: invoice invoice_clientid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT invoice_clientid_fkey FOREIGN KEY (clientid) REFERENCES public.m5_client(m5clientkey) ON DELETE SET NULL;


--
-- Name: invoice invoice_m1key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT invoice_m1key_fkey FOREIGN KEY (m1key) REFERENCES public.m1_controller(m1key) ON DELETE SET NULL;


--
-- Name: legs_m2 legs_m2_driverid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legs_m2
    ADD CONSTRAINT legs_m2_driverid_fkey FOREIGN KEY (driverid) REFERENCES public.m5_employee(userid) ON DELETE SET NULL;


--
-- Name: legs_m2 legs_m2_m1key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legs_m2
    ADD CONSTRAINT legs_m2_m1key_fkey FOREIGN KEY (m1key) REFERENCES public.m1_controller(m1key) ON DELETE CASCADE;


--
-- Name: legs_m2 legs_m2_m5ratekey_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legs_m2
    ADD CONSTRAINT legs_m2_m5ratekey_fkey FOREIGN KEY (m5ratekey) REFERENCES public.m5_driver_rate(m5ratekey) ON DELETE RESTRICT;


--
-- Name: m1_controller m1_controller_addon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m1_controller
    ADD CONSTRAINT m1_controller_addon_id_fkey FOREIGN KEY (addon_id) REFERENCES public.add_ons(addon_id) ON DELETE SET NULL;


--
-- Name: m1_controller m1_controller_client_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m1_controller
    ADD CONSTRAINT m1_controller_client_fkey FOREIGN KEY (client) REFERENCES public.m5_client(m5clientkey) ON DELETE RESTRICT;


--
-- Name: m1_controller m1_controller_shipment_type_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m1_controller
    ADD CONSTRAINT m1_controller_shipment_type_fkey FOREIGN KEY (shipment_type) REFERENCES public.shipment(shipkey) ON DELETE RESTRICT;


--
-- Name: m1_controller_weight m1_controller_weight_m1_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m1_controller_weight
    ADD CONSTRAINT m1_controller_weight_m1_key_fkey FOREIGN KEY (m1_key) REFERENCES public.m1_controller(m1key);


--
-- Name: m5_driver_rate m5_driver_rate_driverid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m5_driver_rate
    ADD CONSTRAINT m5_driver_rate_driverid_fkey FOREIGN KEY (driverid) REFERENCES public.m5_employee(userid) ON DELETE SET NULL;


--
-- Name: payment_m3 payment_m3_clientid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_m3
    ADD CONSTRAINT payment_m3_clientid_fkey FOREIGN KEY (clientid) REFERENCES public.m5_client(m5clientkey) ON DELETE RESTRICT;


--
-- Name: payment_m3 payment_m3_invoiceid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_m3
    ADD CONSTRAINT payment_m3_invoiceid_fkey FOREIGN KEY (invoiceid) REFERENCES public.invoice(ikey) ON DELETE SET NULL;


--
-- Name: purchase_orders purchase_orders_expense_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_expense_type_id_fkey FOREIGN KEY (expense_type_id) REFERENCES public.expense_types(id) ON DELETE SET NULL;


--
-- Name: purchase_orders purchase_orders_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(supplier_id);


--
-- Name: supplier_expense_types supplier_expense_types_expense_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_expense_types
    ADD CONSTRAINT supplier_expense_types_expense_type_id_fkey FOREIGN KEY (expense_type_id) REFERENCES public.expense_types(id) ON DELETE CASCADE;


--
-- Name: supplier_expense_types supplier_expense_types_supplier_pk_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_expense_types
    ADD CONSTRAINT supplier_expense_types_supplier_pk_fkey FOREIGN KEY (se_id) REFERENCES public.suppliers(supplier_id) ON DELETE CASCADE;


--
-- Name: usertable usertable_roleid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usertable
    ADD CONSTRAINT usertable_roleid_fkey FOREIGN KEY (roleid) REFERENCES public.roles(roleid) ON DELETE SET NULL;


--
-- Name: wages wages_employeeid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wages
    ADD CONSTRAINT wages_employeeid_fkey FOREIGN KEY (employeeid) REFERENCES public.m5_employee(userid) ON DELETE SET NULL;


--
-- Name: wages wages_employerid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wages
    ADD CONSTRAINT wages_employerid_fkey FOREIGN KEY (employerid) REFERENCES public.m5_employee(userid) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

