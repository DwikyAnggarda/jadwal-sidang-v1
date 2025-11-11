--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4 (Ubuntu 17.4-1.pgdg20.04+2)
-- Dumped by pg_dump version 17.4 (Ubuntu 17.4-1.pgdg20.04+2)

-- Started on 2025-06-27 16:15:13 WIB

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
-- TOC entry 231 (class 1255 OID 26805)
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 218 (class 1259 OID 25555)
-- Name: dosen; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dosen (
    id integer NOT NULL,
    nama character varying(255) NOT NULL,
    departemen character varying(255),
    bimbingan_saat_ini integer DEFAULT 0,
    maksimal_bimbingan integer DEFAULT 5,
    no_hp character varying,
    nip character varying(255)
);


ALTER TABLE public.dosen OWNER TO postgres;

--
-- TOC entry 3429 (class 0 OID 0)
-- Dependencies: 218
-- Name: COLUMN dosen.nip; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.dosen.nip IS 'nomer induk pegawai (dosen)';


--
-- TOC entry 217 (class 1259 OID 25554)
-- Name: dosen_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.dosen_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dosen_id_seq OWNER TO postgres;

--
-- TOC entry 3430 (class 0 OID 0)
-- Dependencies: 217
-- Name: dosen_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.dosen_id_seq OWNED BY public.dosen.id;


--
-- TOC entry 220 (class 1259 OID 25566)
-- Name: mahasiswa; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mahasiswa (
    id integer NOT NULL,
    nama character varying(255) NOT NULL,
    departemen character varying(255),
    pembimbing_1_id integer,
    pembimbing_2_id integer,
    nrp character varying,
    judul character varying,
    done_sidang integer DEFAULT 0
);


ALTER TABLE public.mahasiswa OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 25565)
-- Name: mahasiswa_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mahasiswa_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mahasiswa_id_seq OWNER TO postgres;

--
-- TOC entry 3431 (class 0 OID 0)
-- Dependencies: 219
-- Name: mahasiswa_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mahasiswa_id_seq OWNED BY public.mahasiswa.id;


--
-- TOC entry 224 (class 1259 OID 25630)
-- Name: rule; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rule (
    id integer NOT NULL,
    jenis_sidang character varying(10) NOT NULL,
    durasi_sidang integer NOT NULL,
    jumlah_penguji integer,
    jam_awal time without time zone,
    jam_akhir time without time zone,
    jumlah_sesi integer
);


ALTER TABLE public.rule OWNER TO postgres;

--
-- TOC entry 3432 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN rule.jenis_sidang; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.rule.jenis_sidang IS 'PA, SPPA';


--
-- TOC entry 3433 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN rule.jumlah_penguji; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.rule.jumlah_penguji IS 'tidak dipakai';


--
-- TOC entry 3434 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN rule.jam_awal; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.rule.jam_awal IS 'tidak dipakai';


--
-- TOC entry 3435 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN rule.jam_akhir; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.rule.jam_akhir IS 'tidak dipakai';


--
-- TOC entry 3436 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN rule.jumlah_sesi; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.rule.jumlah_sesi IS 'untuk mengatur dalam 1 room ada berapa sesi';


--
-- TOC entry 223 (class 1259 OID 25629)
-- Name: rule_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rule_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rule_id_seq OWNER TO postgres;

--
-- TOC entry 3437 (class 0 OID 0)
-- Dependencies: 223
-- Name: rule_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rule_id_seq OWNED BY public.rule.id;


--
-- TOC entry 222 (class 1259 OID 25585)
-- Name: sidang; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sidang (
    id integer NOT NULL,
    mahasiswa_id integer,
    pembimbing_1_id integer,
    pembimbing_2_id integer,
    penguji_1_id integer,
    penguji_2_id integer,
    moderator_id integer,
    room character varying(255),
    waktu timestamp without time zone,
    tanggal_sidang date,
    jam_mulai_sidang time without time zone,
    durasi_sidang integer,
    jam_mulai_final time without time zone,
    jam_selesai_final time without time zone,
    nrp character varying(255),
    nama_mahasiswa character varying(255),
    judul character varying(255),
    jenis_sidang character varying(255)
);


ALTER TABLE public.sidang OWNER TO postgres;

--
-- TOC entry 3438 (class 0 OID 0)
-- Dependencies: 222
-- Name: TABLE sidang; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.sidang IS 'table group item jadwal sidang';


--
-- TOC entry 3439 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN sidang.jenis_sidang; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.sidang.jenis_sidang IS 'dari table rule';


--
-- TOC entry 226 (class 1259 OID 26764)
-- Name: sidang_group; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sidang_group (
    id bigint NOT NULL,
    tanggal_sidang date,
    jam_awal time without time zone,
    jam_akhir time without time zone,
    jenis_sidang character varying(255),
    durasi_sidang integer,
    status_sidang integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sidang_group OWNER TO postgres;

--
-- TOC entry 3440 (class 0 OID 0)
-- Dependencies: 226
-- Name: TABLE sidang_group; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.sidang_group IS 'table group jadwal sidang';


--
-- TOC entry 3441 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN sidang_group.jenis_sidang; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.sidang_group.jenis_sidang IS 'PA, SPPA';


--
-- TOC entry 3442 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN sidang_group.status_sidang; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.sidang_group.status_sidang IS '0 = belum mulai
1 = sedang berlangsung
2 = selesai';


--
-- TOC entry 225 (class 1259 OID 26763)
-- Name: sidang_group_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sidang_group_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sidang_group_id_seq OWNER TO postgres;

--
-- TOC entry 3443 (class 0 OID 0)
-- Dependencies: 225
-- Name: sidang_group_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sidang_group_id_seq OWNED BY public.sidang_group.id;


--
-- TOC entry 221 (class 1259 OID 25584)
-- Name: sidang_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sidang_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sidang_id_seq OWNER TO postgres;

--
-- TOC entry 3444 (class 0 OID 0)
-- Dependencies: 221
-- Name: sidang_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sidang_id_seq OWNED BY public.sidang.id;


--
-- TOC entry 228 (class 1259 OID 26785)
-- Name: sidang_item; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sidang_item (
    id integer NOT NULL,
    mahasiswa_id integer,
    pembimbing_1_id integer,
    pembimbing_2_id integer,
    penguji_1_id integer,
    penguji_2_id integer,
    moderator_id integer,
    room character varying(255),
    waktu timestamp without time zone,
    tanggal_sidang date,
    jam_mulai_sidang time without time zone,
    durasi_sidang integer,
    jam_mulai_final time without time zone,
    jam_selesai_final time without time zone,
    nrp character varying(255),
    nama_mahasiswa character varying(255),
    judul character varying(255),
    jenis_sidang character varying(255),
    sidang_group_id bigint,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sidang_item OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 26784)
-- Name: sidang_item_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sidang_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sidang_item_id_seq OWNER TO postgres;

--
-- TOC entry 3445 (class 0 OID 0)
-- Dependencies: 227
-- Name: sidang_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sidang_item_id_seq OWNED BY public.sidang_item.id;


--
-- TOC entry 230 (class 1259 OID 26795)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    password character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 26794)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 3446 (class 0 OID 0)
-- Dependencies: 229
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 3223 (class 2604 OID 25558)
-- Name: dosen id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dosen ALTER COLUMN id SET DEFAULT nextval('public.dosen_id_seq'::regclass);


--
-- TOC entry 3226 (class 2604 OID 25569)
-- Name: mahasiswa id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mahasiswa ALTER COLUMN id SET DEFAULT nextval('public.mahasiswa_id_seq'::regclass);


--
-- TOC entry 3229 (class 2604 OID 25633)
-- Name: rule id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rule ALTER COLUMN id SET DEFAULT nextval('public.rule_id_seq'::regclass);


--
-- TOC entry 3228 (class 2604 OID 25588)
-- Name: sidang id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sidang ALTER COLUMN id SET DEFAULT nextval('public.sidang_id_seq'::regclass);


--
-- TOC entry 3230 (class 2604 OID 26767)
-- Name: sidang_group id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sidang_group ALTER COLUMN id SET DEFAULT nextval('public.sidang_group_id_seq'::regclass);


--
-- TOC entry 3234 (class 2604 OID 26788)
-- Name: sidang_item id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sidang_item ALTER COLUMN id SET DEFAULT nextval('public.sidang_item_id_seq'::regclass);


--
-- TOC entry 3237 (class 2604 OID 26798)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 3411 (class 0 OID 25555)
-- Dependencies: 218
-- Data for Name: dosen; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.dosen VALUES (286, 'Aliridho Barakbah, S.Kom., Ph.D.', NULL, 0, 5, '081234567890', '199009282022032001');
INSERT INTO public.dosen VALUES (287, 'Andhik Ampuh Yunanto S.Kom., M.Kom', NULL, 0, 5, '081234567890', '199009282022032002');
INSERT INTO public.dosen VALUES (288, 'Arif Basofi, S.Kom., M.T.', NULL, 0, 5, '081234567890', '199009282022032003');
INSERT INTO public.dosen VALUES (289, 'Dr. Bima Sena Bayu Dewantara S.ST, MT', NULL, 0, 5, '081234567890', '199009282022032004');
INSERT INTO public.dosen VALUES (290, 'Ir. Dadet Pramahidanto M.Eng, Ph.D', NULL, 0, 5, '081234567890', '199009282022032099');
INSERT INTO public.dosen VALUES (291, 'Dwi Susanto S.ST, MT', NULL, 0, 5, '081234567890', '199009282022032006');
INSERT INTO public.dosen VALUES (292, 'Fadilah Fahrul Hardiansyah, S.ST., M.Kom.', NULL, 0, 5, '081234567890', '199009282022032007');
INSERT INTO public.dosen VALUES (293, 'Hero Yudo Martono, S.T., M.T.', NULL, 0, 5, '081234567890', '199009282022032008');
INSERT INTO public.dosen VALUES (294, 'Idris Winarno, S.ST., M.Kom.', NULL, 0, 5, '081234567890', '199009282022032109');
INSERT INTO public.dosen VALUES (295, 'Irwan Sumarsono, S.S., M.Pd.', NULL, 0, 5, '081234567890', '199009282022032010');
INSERT INTO public.dosen VALUES (296, 'Isbat Uzzin Nadhori, S.Kom., M.T.', NULL, 0, 5, '081234567890', '199009282022032011');
INSERT INTO public.dosen VALUES (297, 'Iwan Syarif, S.Kom., M.Kom., M.Sc., Ph.D.', NULL, 0, 5, '081234567890', '199009282022032012');
INSERT INTO public.dosen VALUES (298, 'Muarifin, S.ST., M.T.', NULL, 0, 5, '081234567890', '199009282022032013');
INSERT INTO public.dosen VALUES (299, 'Rengga Asmara, S.Kom., M.T.', NULL, 0, 5, '081234567890', '199009282022032014');
INSERT INTO public.dosen VALUES (300, 'Nur Rosyid Mubtadai, S.Kom., M.T.', NULL, 0, 5, '08123175692', '199009282022032015');
INSERT INTO public.dosen VALUES (301, 'Ahmad Syauqi Ahsan, S.Kom., M.T.', NULL, 0, 5, '081234567890', '199009282022032016');
INSERT INTO public.dosen VALUES (302, 'Tri Harsono, S.Si., M.Kom., Ph.D.', NULL, 0, 5, '081234567890', '199009282022032017');
INSERT INTO public.dosen VALUES (303, 'M. Udin Harun Al Rasyid, S.Kom, Ph.D', NULL, 0, 5, '081234567890', '199009282022032018');
INSERT INTO public.dosen VALUES (304, 'Wiratmoko Yuwono, S.T., M.T.', NULL, 0, 5, '081234567890', '199009282022032019');
INSERT INTO public.dosen VALUES (305, 'Yanuar Risah Prayogi S.Kom., M.Kom', NULL, 0, 5, '081234567890', '199009282022032020');
INSERT INTO public.dosen VALUES (306, 'Arna Fariza, S.Kom., M.Kom.', NULL, 0, 5, '081234567890', '199009282022032021');
INSERT INTO public.dosen VALUES (307, 'Desy Intan Permatasari, S.Kom., M.Kom.', NULL, 0, 5, '081234567890', '199009282022032022');
INSERT INTO public.dosen VALUES (308, 'Rosiyah Faradisa S.Si, M.Si', NULL, 0, 5, '081234567890', '199009282022032023');
INSERT INTO public.dosen VALUES (309, 'Entin Martiana Kusumaningtyas, S.Kom, M.Kom', NULL, 0, 5, '081234567890', '199009282022032024');
INSERT INTO public.dosen VALUES (310, 'Fitri Setyorini, S.T., M.Eng.', NULL, 0, 5, '081234567890', '199009282022032025');
INSERT INTO public.dosen VALUES (311, 'Ira Prasetyaningrum, S.Si., M.T.', NULL, 0, 5, '081234567890', '198005292008122005');
INSERT INTO public.dosen VALUES (312, 'Tri Hadiah Muliawati, S.ST., M.Kom.', NULL, 0, 5, '081234567890', '199009282022032026');
INSERT INTO public.dosen VALUES (313, 'Nailussa''ada', NULL, 0, 5, '081234567890', '199009282022032027');
INSERT INTO public.dosen VALUES (314, 'Nana Ramadijanti, S.Kom., M.Kom.', NULL, 0, 5, '081234567890', '199009282022032028');
INSERT INTO public.dosen VALUES (315, 'Tessy Badriyah, S.Kom., M.T., Ph.D.', NULL, 0, 5, '081234567890', '199009282022032029');
INSERT INTO public.dosen VALUES (316, 'Tita Karllita S.Kom., M.Kom', NULL, 0, 5, '081234567890', '199009282022032030');
INSERT INTO public.dosen VALUES (317, 'Umi Sa''adah, S.Kom., M.Kom.', NULL, 0, 5, '081234567890', '199009282022032031');
INSERT INTO public.dosen VALUES (318, 'Ir. Wahjoe Tjatur Sesulihatien MT., Ph.D', NULL, 0, 5, '081234567890', '199009282022032032');
INSERT INTO public.dosen VALUES (319, 'Yuliana Setiowati, S.Kom., M.Kom.', NULL, 0, 5, '081234567890', '199009282022032033');
INSERT INTO public.dosen VALUES (320, 'Dian Septiani Santoso,M. Kom', NULL, 0, 5, '081234567890', '199009282022032009');
INSERT INTO public.dosen VALUES (321, 'Renovita Edelani, S.ST., M.Tr.Kom', NULL, 0, 5, '081234567890', '199009282022032034');


--
-- TOC entry 3413 (class 0 OID 25566)
-- Dependencies: 220
-- Data for Name: mahasiswa; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.mahasiswa VALUES (107, 'Dwiky Anggarda Amien', NULL, NULL, NULL, '3122510604', NULL, 0);
INSERT INTO public.mahasiswa VALUES (108, 'Achmat Alvis Victori', NULL, NULL, NULL, '3122510605', NULL, 0);
INSERT INTO public.mahasiswa VALUES (109, 'Aditya Wahyu Winarno', NULL, NULL, NULL, '3122510606', NULL, 0);
INSERT INTO public.mahasiswa VALUES (110, 'Affan Abdul Fattah', NULL, NULL, NULL, '3122510607', NULL, 0);
INSERT INTO public.mahasiswa VALUES (111, 'Afif Fathurrahman', NULL, NULL, NULL, '3122510608', NULL, 0);
INSERT INTO public.mahasiswa VALUES (112, 'Agnes Ita Ilit', NULL, NULL, NULL, '3122510609', NULL, 0);
INSERT INTO public.mahasiswa VALUES (113, 'Azzahra Marshanda Ichsan', NULL, NULL, NULL, '3122510610', NULL, 0);
INSERT INTO public.mahasiswa VALUES (114, 'Bayu Agung Cahyono', NULL, NULL, NULL, '3122510611', NULL, 0);
INSERT INTO public.mahasiswa VALUES (115, 'Bintang Wahyu Saputra', NULL, NULL, NULL, '3122510612', NULL, 0);
INSERT INTO public.mahasiswa VALUES (116, 'Candra Wulandari', NULL, NULL, NULL, '3122510613', NULL, 0);
INSERT INTO public.mahasiswa VALUES (117, 'Daffa Riski Muliawan', NULL, NULL, NULL, '3122510614', NULL, 0);
INSERT INTO public.mahasiswa VALUES (118, 'Denny Mahendra Satria Putra', NULL, NULL, NULL, '3122510615', NULL, 0);
INSERT INTO public.mahasiswa VALUES (119, 'Fajar Imam Nurrohmat', NULL, NULL, NULL, '3122510616', NULL, 0);
INSERT INTO public.mahasiswa VALUES (120, 'Fajar Wicaksono', NULL, NULL, NULL, '3122510617', NULL, 0);
INSERT INTO public.mahasiswa VALUES (121, 'Famelia Firda Levia', NULL, NULL, NULL, '3122510618', NULL, 0);
INSERT INTO public.mahasiswa VALUES (122, 'Fatihul Hidayat', NULL, NULL, NULL, '3122510619', NULL, 0);
INSERT INTO public.mahasiswa VALUES (123, 'Ghulam Muhtadi Fiamrillah', NULL, NULL, NULL, '3122510620', NULL, 0);
INSERT INTO public.mahasiswa VALUES (124, 'Halimah', NULL, NULL, NULL, '3122510621', NULL, 0);
INSERT INTO public.mahasiswa VALUES (125, 'Irsyad Falah Baskoroputra', NULL, NULL, NULL, '3122510622', NULL, 0);
INSERT INTO public.mahasiswa VALUES (126, 'Jefa Ilham Prayoga', NULL, NULL, NULL, '3122510623', NULL, 0);
INSERT INTO public.mahasiswa VALUES (127, 'Juned Setiawan Suyadi', NULL, NULL, NULL, '3122510624', NULL, 0);
INSERT INTO public.mahasiswa VALUES (128, 'Karina Rossanandari', NULL, NULL, NULL, '3122510625', NULL, 0);
INSERT INTO public.mahasiswa VALUES (129, 'Kenzie Wistara', NULL, NULL, NULL, '3122510626', NULL, 0);
INSERT INTO public.mahasiswa VALUES (130, 'Kristina Siska Witanto', NULL, NULL, NULL, '3122510627', NULL, 0);
INSERT INTO public.mahasiswa VALUES (131, 'Lukman Firmansah', NULL, NULL, NULL, '3122510628', NULL, 0);
INSERT INTO public.mahasiswa VALUES (132, 'Malik Arrosid', NULL, NULL, NULL, '3122510629', NULL, 0);
INSERT INTO public.mahasiswa VALUES (133, 'Moch. Ridho Nur Mahendra Putra', NULL, NULL, NULL, '3122510630', NULL, 0);
INSERT INTO public.mahasiswa VALUES (134, 'Mochammad Ega Yudhistira', NULL, NULL, NULL, '3122510631', NULL, 0);
INSERT INTO public.mahasiswa VALUES (135, 'Muchamad Syikha Akmal', NULL, NULL, NULL, '3122510632', NULL, 0);
INSERT INTO public.mahasiswa VALUES (136, 'Muhamad Yusup', NULL, NULL, NULL, '3122510633', NULL, 0);


--
-- TOC entry 3417 (class 0 OID 25630)
-- Dependencies: 224
-- Data for Name: rule; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.rule VALUES (1, 'SPPA', 30, 10, '09:00:00', '17:00:00', 3);
INSERT INTO public.rule VALUES (8, 'PA', 30, NULL, NULL, NULL, NULL);


--
-- TOC entry 3415 (class 0 OID 25585)
-- Dependencies: 222
-- Data for Name: sidang; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 3419 (class 0 OID 26764)
-- Dependencies: 226
-- Data for Name: sidang_group; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.sidang_group VALUES (77, '2025-07-10', '09:00:00', '12:00:00', 'PA', 30, 1, '2025-06-19 15:59:34.73495', '2025-06-19 15:59:34.73495');
INSERT INTO public.sidang_group VALUES (78, '2025-07-18', '09:00:00', '12:00:00', 'PA', 30, 1, '2025-06-24 14:24:50.844596', '2025-06-24 14:24:50.844596');


--
-- TOC entry 3421 (class 0 OID 26785)
-- Dependencies: 228
-- Data for Name: sidang_item; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.sidang_item VALUES (1211, 107, 320, 311, 286, 289, 320, '1', NULL, '2025-07-18', NULL, 30, '09:00:00', '09:30:00', '3122510604', 'Dwiky Anggarda Amien', 'Pengembangan Sistem AI untuk Otomasi', 'PA', 78, '2025-06-24 14:24:50.844596', '2025-06-24 14:24:50.844596');
INSERT INTO public.sidang_item VALUES (1212, 121, 320, 301, 289, 286, 320, '1', NULL, '2025-07-18', NULL, 30, '09:30:00', '10:00:00', '3122510618', 'Famelia Firda Levia', 'Penerapan Deep Learning dalam Analisis Gambar', 'PA', 78, '2025-06-24 14:24:50.844596', '2025-06-24 14:24:50.844596');
INSERT INTO public.sidang_item VALUES (1213, 127, 320, 303, 286, 289, 320, '1', NULL, '2025-07-18', NULL, 30, '10:00:00', '10:30:00', '3122510624', 'Juned Setiawan Suyadi', 'Pengembangan Sistem Pendukung Keputusan', 'PA', 78, '2025-06-24 14:24:50.844596', '2025-06-24 14:24:50.844596');
INSERT INTO public.sidang_item VALUES (1214, 110, 293, 292, 290, 291, 293, '2', NULL, '2025-07-18', NULL, 30, '10:30:00', '11:00:00', '3122510607', 'Affan Abdul Fattah', 'Pengembangan Model AI untuk Diagnosis', 'PA', 78, '2025-06-24 14:24:50.844596', '2025-06-24 14:24:50.844596');
INSERT INTO public.sidang_item VALUES (1215, 116, 293, 287, 291, 290, 293, '2', NULL, '2025-07-18', NULL, 30, '11:00:00', '11:30:00', '3122510613', 'Candra Wulandari', 'Desain UI/UX Berbasis Data', 'PA', 78, '2025-06-24 14:24:50.844596', '2025-06-24 14:24:50.844596');
INSERT INTO public.sidang_item VALUES (1216, 131, 320, 293, 290, 291, 293, '2', NULL, '2025-07-18', NULL, 30, '11:30:00', '12:00:00', '3122510628', 'Lukman Firmansah', 'Analisis Data Besar untuk Prediksi Tren', 'PA', 78, '2025-06-24 14:24:50.844596', '2025-06-24 14:24:50.844596');
INSERT INTO public.sidang_item VALUES (1217, 112, 299, 307, 295, 296, 299, '3', NULL, '2025-07-18', NULL, 30, '09:00:00', '09:30:00', '3122510609', 'Agnes Ita Ilit', 'Keamanan Siber dalam Era Digital', 'PA', 78, '2025-06-24 14:24:50.844596', '2025-06-24 14:24:50.844596');
INSERT INTO public.sidang_item VALUES (1218, 120, 299, 310, 296, 295, 299, '3', NULL, '2025-07-18', NULL, 30, '09:30:00', '10:00:00', '3122510617', 'Fajar Wicaksono', 'Pengaruh AI dalam Industri Kreatif', 'PA', 78, '2025-06-24 14:24:50.844596', '2025-06-24 14:24:50.844596');
INSERT INTO public.sidang_item VALUES (1219, 126, 299, 288, 295, 296, 299, '3', NULL, '2025-07-18', NULL, 30, '10:00:00', '10:30:00', '3122510623', 'Jefa Ilham Prayoga', 'Penerapan AI dalam Manajemen Sumber Daya', 'PA', 78, '2025-06-24 14:24:50.844596', '2025-06-24 14:24:50.844596');
INSERT INTO public.sidang_item VALUES (1220, 114, 292, 316, 298, 300, 292, '4', NULL, '2025-07-18', NULL, 30, '10:30:00', '11:00:00', '3122510611', 'Bayu Agung Cahyono', 'Machine Learning untuk Prediksi Pasar', 'PA', 78, '2025-06-24 14:24:50.844596', '2025-06-24 14:24:50.844596');
INSERT INTO public.sidang_item VALUES (1221, 125, 292, 318, 300, 298, 292, '4', NULL, '2025-07-18', NULL, 30, '11:00:00', '11:30:00', '3122510622', 'Irsyad Falah Baskoroputra', 'Pengembangan AI untuk Prediksi Cuaca', 'PA', 78, '2025-06-24 14:24:50.844596', '2025-06-24 14:24:50.844596');
INSERT INTO public.sidang_item VALUES (1222, 133, 292, 286, 298, 300, 292, '4', NULL, '2025-07-18', NULL, 30, '11:30:00', '12:00:00', '3122510630', 'Moch. Ridho Nur Mahendra Putra', 'Deep Learning untuk Analisis Kesehatan', 'PA', 78, '2025-06-24 14:24:50.844596', '2025-06-24 14:24:50.844596');
INSERT INTO public.sidang_item VALUES (1223, 108, 304, 320, 305, 303, 304, '5', NULL, '2025-07-18', NULL, 30, '09:00:00', '09:30:00', '3122510605', 'Achmat Alvis Victori', 'Pengembangan Model AI untuk Deteksi Fraud', 'PA', 78, '2025-06-24 14:24:50.844596', '2025-06-24 14:24:50.844596');
INSERT INTO public.sidang_item VALUES (1224, 109, 305, 287, 304, 306, 305, '5', NULL, '2025-07-18', NULL, 30, '09:30:00', '10:00:00', '3122510606', 'Aditya Wahyu Winarno', 'Strategi UX Design untuk Aplikasi Mobile', 'PA', 78, '2025-06-24 14:24:50.844596', '2025-06-24 14:24:50.844596');
INSERT INTO public.sidang_item VALUES (1225, 135, 320, 305, 304, 311, 305, '5', NULL, '2025-07-18', NULL, 30, '10:00:00', '10:30:00', '3122510632', 'Muchamad Syikha Akmal', 'Optimasi Algoritma Kompresi Data', 'PA', 78, '2025-06-24 14:24:50.844596', '2025-06-24 14:24:50.844596');
INSERT INTO public.sidang_item VALUES (1226, 111, 294, 301, 301, 287, 294, '6', NULL, '2025-07-18', NULL, 30, '10:30:00', '11:00:00', '3122510608', 'Afif Fathurrahman', 'Penerapan IoT dalam Manufaktur', 'PA', 78, '2025-06-24 14:24:50.844596', '2025-06-24 14:24:50.844596');
INSERT INTO public.sidang_item VALUES (1227, 113, 301, 309, 294, 287, 301, '6', NULL, '2025-07-18', NULL, 30, '11:00:00', '11:30:00', '3122510610', 'Azzahra Marshanda Ichsan', 'Analisis Jaringan Sosial dengan AI', 'PA', 78, '2025-06-24 14:24:50.844596', '2025-06-24 14:24:50.844596');
INSERT INTO public.sidang_item VALUES (1228, 115, 287, 294, 294, 301, 287, '6', NULL, '2025-07-18', NULL, 30, '11:30:00', '12:00:00', '3122510612', 'Bintang Wahyu Saputra', 'Pembuatan Sistem Rekomendasi E-Commerce', 'PA', 78, '2025-06-24 14:24:50.844596', '2025-06-24 14:24:50.844596');
INSERT INTO public.sidang_item VALUES (1229, 117, 309, 316, 316, 312, 309, '7', NULL, '2025-07-18', NULL, 30, '09:00:00', '09:30:00', '3122510614', 'Daffa Riski Muliawan', 'Optimasi Algoritma Pencarian', 'PA', 78, '2025-06-24 14:24:50.844596', '2025-06-24 14:24:50.844596');
INSERT INTO public.sidang_item VALUES (1230, 118, 316, 321, 309, 313, 316, '7', NULL, '2025-07-18', NULL, 30, '09:30:00', '10:00:00', '3122510615', 'Denny Mahendra Satria Putra', 'Penggunaan Blockchain untuk Keamanan Data', 'PA', 78, '2025-06-24 14:24:50.844596', '2025-06-24 14:24:50.844596');
INSERT INTO public.sidang_item VALUES (1231, 123, 316, 317, 309, 315, 316, '7', NULL, '2025-07-18', NULL, 30, '10:00:00', '10:30:00', '3122510620', 'Ghulam Muhtadi Fiamrillah', 'Analisis Sentimen dalam Media Sosial', 'PA', 78, '2025-06-24 14:24:50.844596', '2025-06-24 14:24:50.844596');
INSERT INTO public.sidang_item VALUES (1232, 119, 307, 308, 314, 310, 307, '8', NULL, '2025-07-18', NULL, 30, '10:30:00', '11:00:00', '3122510616', 'Fajar Imam Nurrohmat', 'Optimasi Sistem Smart Home', 'PA', 78, '2025-06-24 14:24:50.844596', '2025-06-24 14:24:50.844596');
INSERT INTO public.sidang_item VALUES (1233, 122, 314, 313, 307, 310, 314, '8', NULL, '2025-07-18', NULL, 30, '11:00:00', '11:30:00', '3122510619', 'Fatihul Hidayat', 'Pemanfaatan AI dalam Medis', 'PA', 78, '2025-06-24 14:24:50.844596', '2025-06-24 14:24:50.844596');
INSERT INTO public.sidang_item VALUES (1234, 124, 310, 299, 307, 314, 310, '8', NULL, '2025-07-18', NULL, 30, '11:30:00', '12:00:00', '3122510621', 'Halimah', 'Penggunaan AI dalam Automasi Industri', 'PA', 78, '2025-06-24 14:24:50.844596', '2025-06-24 14:24:50.844596');
INSERT INTO public.sidang_item VALUES (1235, 128, 288, 318, 302, 317, 288, '9', NULL, '2025-07-18', NULL, 30, '09:00:00', '09:30:00', '3122510625', 'Karina Rossanandari', 'Penggunaan AI untuk Analisis Big Data', 'PA', 78, '2025-06-24 14:24:50.844596', '2025-06-24 14:24:50.844596');
INSERT INTO public.sidang_item VALUES (1236, 134, 288, 296, 302, 319, 288, '9', NULL, '2025-07-18', NULL, 30, '09:30:00', '10:00:00', '3122510631', 'Mochammad Ega Yudhistira', 'Desain Model AI untuk Navigasi', 'PA', 78, '2025-06-24 14:24:50.844596', '2025-06-24 14:24:50.844596');
INSERT INTO public.sidang_item VALUES (1237, 129, 299, 302, 288, 292, 302, '9', NULL, '2025-07-18', NULL, 30, '10:00:00', '10:30:00', '3122510626', 'Kenzie Wistara', 'Model AI untuk Deteksi Penipuan', 'PA', 78, '2025-06-24 14:24:50.844596', '2025-06-24 14:24:50.844596');
INSERT INTO public.sidang_item VALUES (1238, 130, 318, 286, 297, 308, 318, '10', NULL, '2025-07-18', NULL, 30, '10:30:00', '11:00:00', '3122510627', 'Kristina Siska Witanto', 'Penerapan AI dalam Prediksi Saham', 'PA', 78, '2025-06-24 14:24:50.844596', '2025-06-24 14:24:50.844596');
INSERT INTO public.sidang_item VALUES (1239, 132, 299, 297, 318, 308, 297, '10', NULL, '2025-07-18', NULL, 30, '11:00:00', '11:30:00', '3122510629', 'Malik Arrosid', 'Optimasi Algoritma Pengenalan Wajah', 'PA', 78, '2025-06-24 14:24:50.844596', '2025-06-24 14:24:50.844596');
INSERT INTO public.sidang_item VALUES (1240, 136, 308, 288, 318, 297, 308, '10', NULL, '2025-07-18', NULL, 30, '11:30:00', '12:00:00', '3122510633', 'Muhamad Yusup', 'Penerapan AI dalam Keamanan Siber', 'PA', 78, '2025-06-24 14:24:50.844596', '2025-06-24 14:24:50.844596');
INSERT INTO public.sidang_item VALUES (1181, 107, 320, 311, 286, 289, 320, '1', NULL, '2025-07-10', NULL, 30, '09:00:00', '09:30:00', '3122510604', 'Dwiky Anggarda Amien', 'Pengembangan Sistem AI untuk Otomasi', 'PA', 77, '2025-06-19 15:59:34.73495', '2025-06-19 15:59:34.73495');
INSERT INTO public.sidang_item VALUES (1182, 121, 320, 301, 289, 286, 320, '1', NULL, '2025-07-10', NULL, 30, '09:30:00', '10:00:00', '3122510618', 'Famelia Firda Levia', 'Penerapan Deep Learning dalam Analisis Gambar', 'PA', 77, '2025-06-19 15:59:34.73495', '2025-06-19 15:59:34.73495');
INSERT INTO public.sidang_item VALUES (1183, 127, 320, 303, 286, 289, 320, '1', NULL, '2025-07-10', NULL, 30, '10:00:00', '10:30:00', '3122510624', 'Juned Setiawan Suyadi', 'Pengembangan Sistem Pendukung Keputusan', 'PA', 77, '2025-06-19 15:59:34.73495', '2025-06-19 15:59:34.73495');
INSERT INTO public.sidang_item VALUES (1184, 110, 293, 292, 290, 291, 293, '2', NULL, '2025-07-10', NULL, 30, '10:30:00', '11:00:00', '3122510607', 'Affan Abdul Fattah', 'Pengembangan Model AI untuk Diagnosis', 'PA', 77, '2025-06-19 15:59:34.73495', '2025-06-19 15:59:34.73495');
INSERT INTO public.sidang_item VALUES (1185, 116, 293, 287, 291, 290, 293, '2', NULL, '2025-07-10', NULL, 30, '11:00:00', '11:30:00', '3122510613', 'Candra Wulandari', 'Desain UI/UX Berbasis Data', 'PA', 77, '2025-06-19 15:59:34.73495', '2025-06-19 15:59:34.73495');
INSERT INTO public.sidang_item VALUES (1186, 131, 320, 293, 290, 291, 293, '2', NULL, '2025-07-10', NULL, 30, '11:30:00', '12:00:00', '3122510628', 'Lukman Firmansah', 'Analisis Data Besar untuk Prediksi Tren', 'PA', 77, '2025-06-19 15:59:34.73495', '2025-06-19 15:59:34.73495');
INSERT INTO public.sidang_item VALUES (1187, 112, 299, 307, 295, 296, 299, '3', NULL, '2025-07-10', NULL, 30, '09:00:00', '09:30:00', '3122510609', 'Agnes Ita Ilit', 'Keamanan Siber dalam Era Digital', 'PA', 77, '2025-06-19 15:59:34.73495', '2025-06-19 15:59:34.73495');
INSERT INTO public.sidang_item VALUES (1188, 120, 299, 310, 296, 295, 299, '3', NULL, '2025-07-10', NULL, 30, '09:30:00', '10:00:00', '3122510617', 'Fajar Wicaksono', 'Pengaruh AI dalam Industri Kreatif', 'PA', 77, '2025-06-19 15:59:34.73495', '2025-06-19 15:59:34.73495');
INSERT INTO public.sidang_item VALUES (1189, 126, 299, 288, 295, 296, 299, '3', NULL, '2025-07-10', NULL, 30, '10:00:00', '10:30:00', '3122510623', 'Jefa Ilham Prayoga', 'Penerapan AI dalam Manajemen Sumber Daya', 'PA', 77, '2025-06-19 15:59:34.73495', '2025-06-19 15:59:34.73495');
INSERT INTO public.sidang_item VALUES (1190, 114, 292, 316, 298, 300, 292, '4', NULL, '2025-07-10', NULL, 30, '10:30:00', '11:00:00', '3122510611', 'Bayu Agung Cahyono', 'Machine Learning untuk Prediksi Pasar', 'PA', 77, '2025-06-19 15:59:34.73495', '2025-06-19 15:59:34.73495');
INSERT INTO public.sidang_item VALUES (1191, 125, 292, 318, 300, 298, 292, '4', NULL, '2025-07-10', NULL, 30, '11:00:00', '11:30:00', '3122510622', 'Irsyad Falah Baskoroputra', 'Pengembangan AI untuk Prediksi Cuaca', 'PA', 77, '2025-06-19 15:59:34.73495', '2025-06-19 15:59:34.73495');
INSERT INTO public.sidang_item VALUES (1192, 133, 292, 286, 298, 300, 292, '4', NULL, '2025-07-10', NULL, 30, '11:30:00', '12:00:00', '3122510630', 'Moch. Ridho Nur Mahendra Putra', 'Deep Learning untuk Analisis Kesehatan', 'PA', 77, '2025-06-19 15:59:34.73495', '2025-06-19 15:59:34.73495');
INSERT INTO public.sidang_item VALUES (1193, 108, 304, 320, 305, 303, 304, '5', NULL, '2025-07-10', NULL, 30, '09:00:00', '09:30:00', '3122510605', 'Achmat Alvis Victori', 'Pengembangan Model AI untuk Deteksi Fraud', 'PA', 77, '2025-06-19 15:59:34.73495', '2025-06-19 15:59:34.73495');
INSERT INTO public.sidang_item VALUES (1194, 109, 305, 287, 304, 306, 305, '5', NULL, '2025-07-10', NULL, 30, '09:30:00', '10:00:00', '3122510606', 'Aditya Wahyu Winarno', 'Strategi UX Design untuk Aplikasi Mobile', 'PA', 77, '2025-06-19 15:59:34.73495', '2025-06-19 15:59:34.73495');
INSERT INTO public.sidang_item VALUES (1195, 135, 320, 305, 304, 311, 305, '5', NULL, '2025-07-10', NULL, 30, '10:00:00', '10:30:00', '3122510632', 'Muchamad Syikha Akmal', 'Optimasi Algoritma Kompresi Data', 'PA', 77, '2025-06-19 15:59:34.73495', '2025-06-19 15:59:34.73495');
INSERT INTO public.sidang_item VALUES (1196, 111, 294, 301, 301, 287, 294, '6', NULL, '2025-07-10', NULL, 30, '10:30:00', '11:00:00', '3122510608', 'Afif Fathurrahman', 'Penerapan IoT dalam Manufaktur', 'PA', 77, '2025-06-19 15:59:34.73495', '2025-06-19 15:59:34.73495');
INSERT INTO public.sidang_item VALUES (1197, 113, 301, 309, 294, 287, 301, '6', NULL, '2025-07-10', NULL, 30, '11:00:00', '11:30:00', '3122510610', 'Azzahra Marshanda Ichsan', 'Analisis Jaringan Sosial dengan AI', 'PA', 77, '2025-06-19 15:59:34.73495', '2025-06-19 15:59:34.73495');
INSERT INTO public.sidang_item VALUES (1198, 115, 287, 294, 294, 301, 287, '6', NULL, '2025-07-10', NULL, 30, '11:30:00', '12:00:00', '3122510612', 'Bintang Wahyu Saputra', 'Pembuatan Sistem Rekomendasi E-Commerce', 'PA', 77, '2025-06-19 15:59:34.73495', '2025-06-19 15:59:34.73495');
INSERT INTO public.sidang_item VALUES (1199, 117, 309, 316, 316, 312, 309, '7', NULL, '2025-07-10', NULL, 30, '09:00:00', '09:30:00', '3122510614', 'Daffa Riski Muliawan', 'Optimasi Algoritma Pencarian', 'PA', 77, '2025-06-19 15:59:34.73495', '2025-06-19 15:59:34.73495');
INSERT INTO public.sidang_item VALUES (1200, 118, 316, 321, 309, 313, 316, '7', NULL, '2025-07-10', NULL, 30, '09:30:00', '10:00:00', '3122510615', 'Denny Mahendra Satria Putra', 'Penggunaan Blockchain untuk Keamanan Data', 'PA', 77, '2025-06-19 15:59:34.73495', '2025-06-19 15:59:34.73495');
INSERT INTO public.sidang_item VALUES (1201, 123, 316, 317, 309, 315, 316, '7', NULL, '2025-07-10', NULL, 30, '10:00:00', '10:30:00', '3122510620', 'Ghulam Muhtadi Fiamrillah', 'Analisis Sentimen dalam Media Sosial', 'PA', 77, '2025-06-19 15:59:34.73495', '2025-06-19 15:59:34.73495');
INSERT INTO public.sidang_item VALUES (1202, 119, 307, 308, 314, 310, 307, '8', NULL, '2025-07-10', NULL, 30, '10:30:00', '11:00:00', '3122510616', 'Fajar Imam Nurrohmat', 'Optimasi Sistem Smart Home', 'PA', 77, '2025-06-19 15:59:34.73495', '2025-06-19 15:59:34.73495');
INSERT INTO public.sidang_item VALUES (1203, 122, 314, 313, 307, 310, 314, '8', NULL, '2025-07-10', NULL, 30, '11:00:00', '11:30:00', '3122510619', 'Fatihul Hidayat', 'Pemanfaatan AI dalam Medis', 'PA', 77, '2025-06-19 15:59:34.73495', '2025-06-19 15:59:34.73495');
INSERT INTO public.sidang_item VALUES (1204, 124, 310, 299, 307, 314, 310, '8', NULL, '2025-07-10', NULL, 30, '11:30:00', '12:00:00', '3122510621', 'Halimah', 'Penggunaan AI dalam Automasi Industri', 'PA', 77, '2025-06-19 15:59:34.73495', '2025-06-19 15:59:34.73495');
INSERT INTO public.sidang_item VALUES (1205, 128, 288, 318, 302, 317, 288, '9', NULL, '2025-07-10', NULL, 30, '09:00:00', '09:30:00', '3122510625', 'Karina Rossanandari', 'Penggunaan AI untuk Analisis Big Data', 'PA', 77, '2025-06-19 15:59:34.73495', '2025-06-19 15:59:34.73495');
INSERT INTO public.sidang_item VALUES (1206, 134, 288, 296, 302, 319, 288, '9', NULL, '2025-07-10', NULL, 30, '09:30:00', '10:00:00', '3122510631', 'Mochammad Ega Yudhistira', 'Desain Model AI untuk Navigasi', 'PA', 77, '2025-06-19 15:59:34.73495', '2025-06-19 15:59:34.73495');
INSERT INTO public.sidang_item VALUES (1207, 129, 299, 302, 288, 292, 302, '9', NULL, '2025-07-10', NULL, 30, '10:00:00', '10:30:00', '3122510626', 'Kenzie Wistara', 'Model AI untuk Deteksi Penipuan', 'PA', 77, '2025-06-19 15:59:34.73495', '2025-06-19 15:59:34.73495');
INSERT INTO public.sidang_item VALUES (1208, 130, 318, 286, 297, 308, 318, '10', NULL, '2025-07-10', NULL, 30, '10:30:00', '11:00:00', '3122510627', 'Kristina Siska Witanto', 'Penerapan AI dalam Prediksi Saham', 'PA', 77, '2025-06-19 15:59:34.73495', '2025-06-19 15:59:34.73495');
INSERT INTO public.sidang_item VALUES (1209, 132, 299, 297, 318, 308, 297, '10', NULL, '2025-07-10', NULL, 30, '11:00:00', '11:30:00', '3122510629', 'Malik Arrosid', 'Optimasi Algoritma Pengenalan Wajah', 'PA', 77, '2025-06-19 15:59:34.73495', '2025-06-19 15:59:34.73495');
INSERT INTO public.sidang_item VALUES (1210, 136, 308, 288, 318, 297, 308, '10', NULL, '2025-07-10', NULL, 30, '11:30:00', '12:00:00', '3122510633', 'Muhamad Yusup', 'Penerapan AI dalam Keamanan Siber', 'PA', 77, '2025-06-19 15:59:34.73495', '2025-06-19 15:59:34.73495');


--
-- TOC entry 3423 (class 0 OID 26795)
-- Dependencies: 230
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.users VALUES (2, 'admin', '$2b$10$ad64TyF7DRwCfRaogExt9.LFAZqD0nctprwPKrEhZi7Er8T/NdgdS', '2025-06-15 21:04:46.700437+07', '2025-06-15 21:04:46.700437+07');


--
-- TOC entry 3447 (class 0 OID 0)
-- Dependencies: 217
-- Name: dosen_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.dosen_id_seq', 323, true);


--
-- TOC entry 3448 (class 0 OID 0)
-- Dependencies: 219
-- Name: mahasiswa_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.mahasiswa_id_seq', 138, true);


--
-- TOC entry 3449 (class 0 OID 0)
-- Dependencies: 223
-- Name: rule_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rule_id_seq', 9, true);


--
-- TOC entry 3450 (class 0 OID 0)
-- Dependencies: 225
-- Name: sidang_group_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sidang_group_id_seq', 78, true);


--
-- TOC entry 3451 (class 0 OID 0)
-- Dependencies: 221
-- Name: sidang_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sidang_id_seq', 87, true);


--
-- TOC entry 3452 (class 0 OID 0)
-- Dependencies: 227
-- Name: sidang_item_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sidang_item_id_seq', 1240, true);


--
-- TOC entry 3453 (class 0 OID 0)
-- Dependencies: 229
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 2, true);


--
-- TOC entry 3241 (class 2606 OID 25564)
-- Name: dosen dosen_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dosen
    ADD CONSTRAINT dosen_pkey PRIMARY KEY (id);


--
-- TOC entry 3243 (class 2606 OID 25573)
-- Name: mahasiswa mahasiswa_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mahasiswa
    ADD CONSTRAINT mahasiswa_pkey PRIMARY KEY (id);


--
-- TOC entry 3247 (class 2606 OID 25635)
-- Name: rule rule_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rule
    ADD CONSTRAINT rule_pkey PRIMARY KEY (id);


--
-- TOC entry 3249 (class 2606 OID 26769)
-- Name: sidang_group sidang_group_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sidang_group
    ADD CONSTRAINT sidang_group_pkey PRIMARY KEY (id);


--
-- TOC entry 3251 (class 2606 OID 26792)
-- Name: sidang_item sidang_item_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sidang_item
    ADD CONSTRAINT sidang_item_pkey PRIMARY KEY (id);


--
-- TOC entry 3245 (class 2606 OID 25590)
-- Name: sidang sidang_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sidang
    ADD CONSTRAINT sidang_pkey PRIMARY KEY (id);


--
-- TOC entry 3253 (class 2606 OID 26802)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3255 (class 2606 OID 26804)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- TOC entry 3264 (class 2620 OID 26806)
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3256 (class 2606 OID 25574)
-- Name: mahasiswa mahasiswa_pembimbing_1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mahasiswa
    ADD CONSTRAINT mahasiswa_pembimbing_1_id_fkey FOREIGN KEY (pembimbing_1_id) REFERENCES public.dosen(id);


--
-- TOC entry 3257 (class 2606 OID 25579)
-- Name: mahasiswa mahasiswa_pembimbing_2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mahasiswa
    ADD CONSTRAINT mahasiswa_pembimbing_2_id_fkey FOREIGN KEY (pembimbing_2_id) REFERENCES public.dosen(id);


--
-- TOC entry 3258 (class 2606 OID 25591)
-- Name: sidang sidang_mahasiswa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sidang
    ADD CONSTRAINT sidang_mahasiswa_id_fkey FOREIGN KEY (mahasiswa_id) REFERENCES public.mahasiswa(id);


--
-- TOC entry 3259 (class 2606 OID 25616)
-- Name: sidang sidang_moderator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sidang
    ADD CONSTRAINT sidang_moderator_id_fkey FOREIGN KEY (moderator_id) REFERENCES public.dosen(id);


--
-- TOC entry 3260 (class 2606 OID 25596)
-- Name: sidang sidang_pembimbing_1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sidang
    ADD CONSTRAINT sidang_pembimbing_1_id_fkey FOREIGN KEY (pembimbing_1_id) REFERENCES public.dosen(id);


--
-- TOC entry 3261 (class 2606 OID 25601)
-- Name: sidang sidang_pembimbing_2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sidang
    ADD CONSTRAINT sidang_pembimbing_2_id_fkey FOREIGN KEY (pembimbing_2_id) REFERENCES public.dosen(id);


--
-- TOC entry 3262 (class 2606 OID 25606)
-- Name: sidang sidang_penguji_1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sidang
    ADD CONSTRAINT sidang_penguji_1_id_fkey FOREIGN KEY (penguji_1_id) REFERENCES public.dosen(id);


--
-- TOC entry 3263 (class 2606 OID 25611)
-- Name: sidang sidang_penguji_2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sidang
    ADD CONSTRAINT sidang_penguji_2_id_fkey FOREIGN KEY (penguji_2_id) REFERENCES public.dosen(id);


-- Completed on 2025-06-27 16:15:13 WIB

--
-- PostgreSQL database dump complete
--

