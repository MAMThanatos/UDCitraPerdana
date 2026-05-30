-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 24, 2026 at 08:00 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `ud_citra_perdana`
--

-- Disable foreign key checks
SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `detailkeluar`;
DROP TABLE IF EXISTS `detailmasuk`;
DROP TABLE IF EXISTS `transaksikeluar`;
DROP TABLE IF EXISTS `transaksimasuk`;
DROP TABLE IF EXISTS `barang`;
DROP TABLE IF EXISTS `kategori`;
DROP TABLE IF EXISTS `supplier`;
DROP TABLE IF EXISTS `user`;

CREATE TABLE `user` (
  `id_user` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL UNIQUE,
  `password` varchar(255) NOT NULL,
  `nama_lengkap` varchar(100) NOT NULL,
  `role` varchar(50) NOT NULL,
  PRIMARY KEY (`id_user`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `user` (`id_user`, `username`, `password`, `nama_lengkap`, `role`) VALUES
(1, 'admin', '$2y$10$3OGXwp3x4h7lQ9US2LG.x.zRM201MFOGbJ5BxPO4oe3Olkg1WzInq', 'Administrator Super', 'Admin / Owner'),
(2, 'budi_gudang', '$2y$10$VIMgLxtTiCMu6fW4Y/f.7OdwxIGNKUOrdLcIHB.WOqpZ50pRJpZ06', 'Budi Santoso', 'Staf Gudang');

-- --------------------------------------------------------

--
-- Table structure for table `kategori`
--

CREATE TABLE `kategori` (
  `id_kategori` int(11) NOT NULL AUTO_INCREMENT,
  `nama_kategori` varchar(50) NOT NULL UNIQUE,
  PRIMARY KEY (`id_kategori`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `kategori` (`id_kategori`, `nama_kategori`) VALUES
(1, 'Bahan Bangunan'),
(2, 'Peralatan & Perkakas'),
(3, 'Cat & Finishing'),
(4, 'Pipa & Saniter');

-- --------------------------------------------------------

--
-- Table structure for table `supplier`
--

CREATE TABLE `supplier` (
  `id_supplier` int(11) NOT NULL AUTO_INCREMENT,
  `nama_supplier` varchar(100) NOT NULL UNIQUE,
  `alamat` text DEFAULT NULL,
  `no_telp` varchar(15) DEFAULT NULL,
  PRIMARY KEY (`id_supplier`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `supplier` (`id_supplier`, `nama_supplier`, `alamat`, `no_telp`) VALUES
(1, 'PT. Semen Indonesia', 'Gresik, Jawa Timur', '08123456789'),
(2, 'Toko Besi Makmur', 'Surabaya, Jawa Timur', '08234567890'),
(3, 'CV. Dulux Colorindo', 'Jakarta Barat', '08345678901'),
(4, 'PT. Rucika Saniter', 'Tangerang, Banten', '08456789012');

-- --------------------------------------------------------

--
-- Table structure for table `barang`
--

CREATE TABLE `barang` (
  `id_barang` int(11) NOT NULL AUTO_INCREMENT,
  `id_kategori` int(11) NOT NULL,
  `kode_barang` varchar(50) NOT NULL UNIQUE,
  `nama_barang` varchar(100) NOT NULL,
  `stok` int(11) NOT NULL DEFAULT 0,
  `satuan` varchar(50) NOT NULL,
  `harga` double NOT NULL DEFAULT 0,
  `harga_beli` double NOT NULL DEFAULT 0,
  `deskripsi` text DEFAULT NULL,
  `berat` varchar(50) DEFAULT NULL,
  `dimensi` varchar(50) DEFAULT NULL,
  `lokasi_rak` varchar(50) DEFAULT NULL,
  `stok_minimum` int(11) NOT NULL DEFAULT 10,
  PRIMARY KEY (`id_barang`),
  KEY `id_kategori` (`id_kategori`),
  CONSTRAINT `barang_ibfk_1` FOREIGN KEY (`id_kategori`) REFERENCES `kategori` (`id_kategori`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `transaksimasuk`
--

CREATE TABLE `transaksimasuk` (
  `id_masuk` int(11) NOT NULL AUTO_INCREMENT,
  `id_supplier` int(11) NOT NULL,
  `id_user` int(11) NOT NULL,
  `tgl_masuk` date NOT NULL,
  `no_po` varchar(50) DEFAULT NULL,
  `no_ref` varchar(50) NOT NULL,
  `keterangan` text DEFAULT NULL,
  PRIMARY KEY (`id_masuk`),
  KEY `id_supplier` (`id_supplier`),
  KEY `id_user` (`id_user`),
  CONSTRAINT `transaksimasuk_ibfk_1` FOREIGN KEY (`id_supplier`) REFERENCES `supplier` (`id_supplier`) ON DELETE RESTRICT,
  CONSTRAINT `transaksimasuk_ibfk_2` FOREIGN KEY (`id_user`) REFERENCES `user` (`id_user`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `detailmasuk`
--

CREATE TABLE `detailmasuk` (
  `id_detail` int(11) NOT NULL AUTO_INCREMENT,
  `id_masuk` int(11) NOT NULL,
  `id_barang` int(11) NOT NULL,
  `jumlah` int(11) NOT NULL,
  `kondisi_qc` varchar(50) NOT NULL DEFAULT 'Baik (Lolos QC)',
  PRIMARY KEY (`id_detail`),
  KEY `id_masuk` (`id_masuk`),
  KEY `id_barang` (`id_barang`),
  CONSTRAINT `detailmasuk_ibfk_1` FOREIGN KEY (`id_masuk`) REFERENCES `transaksimasuk` (`id_masuk`) ON DELETE CASCADE,
  CONSTRAINT `detailmasuk_ibfk_2` FOREIGN KEY (`id_barang`) REFERENCES `barang` (`id_barang`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `transaksikeluar`
--

CREATE TABLE `transaksikeluar` (
  `id_keluar` int(11) NOT NULL AUTO_INCREMENT,
  `id_user` int(11) NOT NULL,
  `tgl_keluar` date NOT NULL,
  `no_ref` varchar(50) NOT NULL,
  `tujuan_proyek` varchar(100) NOT NULL,
  `tujuan_pengeluaran` varchar(50) NOT NULL,
  `keterangan` text DEFAULT NULL,
  PRIMARY KEY (`id_keluar`),
  KEY `id_user` (`id_user`),
  CONSTRAINT `transaksikeluar_ibfk_1` FOREIGN KEY (`id_user`) REFERENCES `user` (`id_user`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `detailkeluar`
--

CREATE TABLE `detailkeluar` (
  `id_detail` int(11) NOT NULL AUTO_INCREMENT,
  `id_keluar` int(11) NOT NULL,
  `id_barang` int(11) NOT NULL,
  `jumlah` int(11) NOT NULL,
  PRIMARY KEY (`id_detail`),
  KEY `id_keluar` (`id_keluar`),
  KEY `id_barang` (`id_barang`),
  CONSTRAINT `detailkeluar_ibfk_1` FOREIGN KEY (`id_keluar`) REFERENCES `transaksikeluar` (`id_keluar`) ON DELETE CASCADE,
  CONSTRAINT `detailkeluar_ibfk_2` FOREIGN KEY (`id_barang`) REFERENCES `barang` (`id_barang`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
