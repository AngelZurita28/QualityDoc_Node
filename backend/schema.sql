-- =========================================
-- DATABASE CREATION
-- =========================================
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'QualityDocDB')
BEGIN
    CREATE DATABASE QualityDocDB;
END
GO

USE QualityDocDB;
GO

-- =========================================
-- TABLE: COMPANIES (Multi-tenant layer)
-- =========================================
CREATE TABLE Companies (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name VARCHAR(100) NOT NULL UNIQUE,
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- =========================================
-- TABLE: ROLES
-- =========================================
CREATE TABLE Roles (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name VARCHAR(50) NOT NULL UNIQUE
);
GO

-- =========================================
-- TABLE: USERS
-- =========================================
CREATE TABLE Users (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    FullName VARCHAR(100) NOT NULL,
    Email VARCHAR(100) NOT NULL UNIQUE,
    PasswordHash VARCHAR(256) NOT NULL,
    RoleId INT NOT NULL,
    CompanyId INT NULL, -- NULL only for SuperAdmin (Global Access)
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETDATE(),

    FOREIGN KEY (RoleId) REFERENCES Roles(Id),
    FOREIGN KEY (CompanyId) REFERENCES Companies(Id)
);
GO

-- =========================================
-- TABLE: DOCUMENT_STATUS
-- =========================================
CREATE TABLE DocumentStatus (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name VARCHAR(50) NOT NULL UNIQUE
);
GO

-- =========================================
-- TABLE: DOCUMENTS (Versioning & API Sync)
-- =========================================
CREATE TABLE Documents (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ParentId UNIQUEIDENTIFIER NULL, -- For versioning: points to the first version's ID
    VersionNumber INT DEFAULT 1,
    IsLatest BIT DEFAULT 1,         -- 1 = Current version, 0 = Obsolete/Legacy
    Title VARCHAR(200) NOT NULL,
    Description TEXT,
    FilePath VARCHAR(500),
    AuthorId INT NOT NULL,
    StatusId INT NOT NULL,
    CompanyId INT NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),

    -- Sync Logic (API tracking)
    SyncPostgre BIT DEFAULT 0,
    SyncFirebase BIT DEFAULT 0,
    LastErrorLog TEXT,

    FOREIGN KEY (ParentId) REFERENCES Documents(Id),
    FOREIGN KEY (AuthorId) REFERENCES Users(Id),
    FOREIGN KEY (StatusId) REFERENCES DocumentStatus(Id),
    FOREIGN KEY (CompanyId) REFERENCES Companies(Id)
);
GO

-- =========================================
-- TABLE: APPROVAL_HISTORY
-- =========================================
CREATE TABLE ApprovalHistory (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    DocumentId UNIQUEIDENTIFIER NOT NULL,
    UserId INT NOT NULL,
    Action VARCHAR(50) NOT NULL,
    Comment TEXT,
    ActionDate DATETIME DEFAULT GETDATE(),

    FOREIGN KEY (DocumentId) REFERENCES Documents(Id),
    FOREIGN KEY (UserId) REFERENCES Users(Id)
);
GO

-- =========================================
-- SEED DATA (INITIAL DATA)
-- =========================================

-- 1. Companies
INSERT INTO Companies (Name) VALUES 
('Empresa Matriz SA de CV'), 
('Planta Industrial B');
GO

-- 2. Roles
INSERT INTO Roles (Name) VALUES 
('SuperAdmin'), 
('Admin'), 
('Approver'), 
('Operator');
GO

-- 3. Document Status
-- Se definen los estados para el ciclo de vida del documento 
INSERT INTO DocumentStatus (Name) VALUES 
('Borrador'), 
('Revision'), 
('Aprobado'), 
('Obsoleto');
GO

-- 4. Admin Users
-- Se configura la contraseña (ej. '123456' hasheada) y los accesos globales/locales
INSERT INTO Users (FullName, Email, PasswordHash, RoleId, CompanyId) VALUES 
('Super Administrador', 'admin@admin.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 1, NULL), -- SuperAdmin sin empresa (NULL) para ver todo
('Administrador Planta B', 'admin@plantab.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 2, 2); -- Admin limitado a la Empresa 2
GO