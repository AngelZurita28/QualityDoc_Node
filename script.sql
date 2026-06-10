USE [master]
GO

-- 1. Crear la base de datos de forma estándar (Docker decidirá las rutas en Linux)
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'QualityDocDB')
BEGIN
    CREATE DATABASE [QualityDocDB];
END
GO

-- 2. Configurar el modo y compatibilidad básica
ALTER DATABASE [QualityDocDB] SET COMPATIBILITY_LEVEL = 160 -- Nivel compatible con contenedores modernos
GO
ALTER DATABASE [QualityDocDB] SET RECOVERY SIMPLE 
GO
ALTER DATABASE [QualityDocDB] SET MULTI_USER 
GO

-- 3. Entrar a la base de datos para crear la estructura
USE [QualityDocDB]
GO
/****** Objeto: Table [dbo].[ApprovalHistory] Fecha de script: 09/06/2026 10:37:34 p. m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ApprovalHistory](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[DocumentId] [uniqueidentifier] NOT NULL,
	[UserId] [int] NOT NULL,
	[Action] [varchar](50) NOT NULL,
	[Comment] [text] NULL,
	[ActionDate] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[Companies] Fecha de script: 09/06/2026 10:37:35 p. m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Companies](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[Name] [varchar](100) NOT NULL,
	[IsActive] [bit] NULL,
	[CreatedAt] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[Name] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[Departments] Fecha de script: 09/06/2026 10:37:35 p. m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Departments](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[Name] [nvarchar](100) NOT NULL,
	[CompanyId] [int] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[Documents] Fecha de script: 09/06/2026 10:37:35 p. m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Documents](
	[Id] [uniqueidentifier] NOT NULL,
	[ParentId] [uniqueidentifier] NULL,
	[VersionNumber] [decimal](10, 2) NULL,
	[IsLatest] [bit] NULL,
	[Title] [varchar](200) NOT NULL,
	[Description] [text] NULL,
	[FilePath] [varchar](500) NULL,
	[AuthorId] [int] NOT NULL,
	[StatusId] [int] NOT NULL,
	[CompanyId] [int] NOT NULL,
	[CreatedAt] [datetime] NULL,
	[SyncPostgre] [bit] NULL,
	[SyncFirebase] [bit] NULL,
	[LastErrorLog] [text] NULL,
	[RowVersion] [rowversion] NOT NULL,
	[DocumentCode] [varchar](50) NULL,
	[DepartmentId] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[DocumentStatus] Fecha de script: 09/06/2026 10:37:35 p. m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[DocumentStatus](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[Name] [varchar](50) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[Name] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[Roles] Fecha de script: 09/06/2026 10:37:35 p. m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Roles](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[Name] [varchar](50) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[Name] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Objeto: Table [dbo].[Users] Fecha de script: 09/06/2026 10:37:35 p. m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Users](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[FullName] [varchar](100) NOT NULL,
	[Email] [varchar](100) NOT NULL,
	[PasswordHash] [varchar](256) NOT NULL,
	[RoleId] [int] NOT NULL,
	[CompanyId] [int] NULL,
	[IsActive] [bit] NULL,
	[CreatedAt] [datetime] NULL,
	[DepartmentId] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[Email] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
ALTER TABLE [dbo].[ApprovalHistory] ADD  DEFAULT (getdate()) FOR [ActionDate]
GO
ALTER TABLE [dbo].[Companies] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[Companies] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Documents] ADD  DEFAULT (newid()) FOR [Id]
GO
ALTER TABLE [dbo].[Documents] ADD  DEFAULT ((0)) FOR [IsLatest]
GO
ALTER TABLE [dbo].[Documents] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Documents] ADD  DEFAULT ((0)) FOR [SyncPostgre]
GO
ALTER TABLE [dbo].[Documents] ADD  DEFAULT ((0)) FOR [SyncFirebase]
GO
ALTER TABLE [dbo].[Users] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[Users] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[ApprovalHistory]  WITH CHECK ADD FOREIGN KEY([DocumentId])
REFERENCES [dbo].[Documents] ([Id])
GO
ALTER TABLE [dbo].[ApprovalHistory]  WITH CHECK ADD FOREIGN KEY([UserId])
REFERENCES [dbo].[Users] ([Id])
GO
ALTER TABLE [dbo].[Documents]  WITH CHECK ADD FOREIGN KEY([AuthorId])
REFERENCES [dbo].[Users] ([Id])
GO
ALTER TABLE [dbo].[Documents]  WITH CHECK ADD FOREIGN KEY([CompanyId])
REFERENCES [dbo].[Companies] ([Id])
GO
ALTER TABLE [dbo].[Documents]  WITH CHECK ADD FOREIGN KEY([ParentId])
REFERENCES [dbo].[Documents] ([Id])
GO
ALTER TABLE [dbo].[Documents]  WITH CHECK ADD FOREIGN KEY([StatusId])
REFERENCES [dbo].[DocumentStatus] ([Id])
GO
ALTER TABLE [dbo].[Documents]  WITH CHECK ADD  CONSTRAINT [FK_Documents_Departments] FOREIGN KEY([DepartmentId])
REFERENCES [dbo].[Departments] ([Id])
GO
ALTER TABLE [dbo].[Documents] CHECK CONSTRAINT [FK_Documents_Departments]
GO
ALTER TABLE [dbo].[Departments]  WITH CHECK ADD  CONSTRAINT [FK_Departments_Companies] FOREIGN KEY([CompanyId])
REFERENCES [dbo].[Companies] ([Id])
GO
ALTER TABLE [dbo].[Departments] CHECK CONSTRAINT [FK_Departments_Companies]
GO
ALTER TABLE [dbo].[Users]  WITH CHECK ADD FOREIGN KEY([CompanyId])
REFERENCES [dbo].[Companies] ([Id])
GO
ALTER TABLE [dbo].[Users]  WITH CHECK ADD FOREIGN KEY([RoleId])
REFERENCES [dbo].[Roles] ([Id])
GO
ALTER TABLE [dbo].[Users]  WITH CHECK ADD  CONSTRAINT [FK_Users_Departments] FOREIGN KEY([DepartmentId])
REFERENCES [dbo].[Departments] ([Id])
GO
ALTER TABLE [dbo].[Users] CHECK CONSTRAINT [FK_Users_Departments]
GO

CREATE UNIQUE INDEX [UX_Documents_ActiveVersion]
ON [dbo].[Documents]([CompanyId], [DocumentCode])
WHERE [IsLatest] = 1 AND [DocumentCode] IS NOT NULL
GO

CREATE INDEX [IX_Documents_DocumentCode_VersionNumber]
ON [dbo].[Documents]([CompanyId], [DocumentCode], [VersionNumber])
GO

CREATE INDEX [IX_Documents_CompanyId_StatusId]
ON [dbo].[Documents]([CompanyId], [StatusId])
GO

CREATE INDEX [IX_Documents_AuthorId_StatusId]
ON [dbo].[Documents]([AuthorId], [StatusId])
GO

-- 4. Insertar datos por defecto
SET IDENTITY_INSERT [dbo].[Roles] ON;
INSERT INTO [dbo].[Roles] ([Id], [Name]) VALUES (1, 'Super Admin');
INSERT INTO [dbo].[Roles] ([Id], [Name]) VALUES (2, 'Admin');
INSERT INTO [dbo].[Roles] ([Id], [Name]) VALUES (3, 'Reviewer');
INSERT INTO [dbo].[Roles] ([Id], [Name]) VALUES (4, 'Redacter');
INSERT INTO [dbo].[Roles] ([Id], [Name]) VALUES (5, 'Operador');
SET IDENTITY_INSERT [dbo].[Roles] OFF;
GO

SET IDENTITY_INSERT [dbo].[Companies] ON;
INSERT INTO [dbo].[Companies] ([Id], [Name], [IsActive]) VALUES (1, 'Empresa 1', 1);
INSERT INTO [dbo].[Companies] ([Id], [Name], [IsActive]) VALUES (2, 'Empresa 2', 1);
SET IDENTITY_INSERT [dbo].[Companies] OFF;
GO

SET IDENTITY_INSERT [dbo].[Departments] ON;
INSERT INTO [dbo].[Departments] ([Id], [Name], [CompanyId]) VALUES (1, 'E1 - Departamento A', 1);
INSERT INTO [dbo].[Departments] ([Id], [Name], [CompanyId]) VALUES (2, 'E1 - Departamento B', 1);
INSERT INTO [dbo].[Departments] ([Id], [Name], [CompanyId]) VALUES (3, 'E2 - Departamento C', 2);
INSERT INTO [dbo].[Departments] ([Id], [Name], [CompanyId]) VALUES (4, 'E2 - Departamento D', 2);
SET IDENTITY_INSERT [dbo].[Departments] OFF;
GO

SET IDENTITY_INSERT [dbo].[DocumentStatus] ON;
INSERT INTO [dbo].[DocumentStatus] ([Id], [Name]) VALUES (1, 'Borrador');
INSERT INTO [dbo].[DocumentStatus] ([Id], [Name]) VALUES (2, 'En Revision');
INSERT INTO [dbo].[DocumentStatus] ([Id], [Name]) VALUES (3, 'Candidata');
INSERT INTO [dbo].[DocumentStatus] ([Id], [Name]) VALUES (4, 'Rechazado');
INSERT INTO [dbo].[DocumentStatus] ([Id], [Name]) VALUES (5, 'Activo');
INSERT INTO [dbo].[DocumentStatus] ([Id], [Name]) VALUES (6, 'Obsoleto');
SET IDENTITY_INSERT [dbo].[DocumentStatus] OFF;
GO

SET IDENTITY_INSERT [dbo].[Users] ON;
-- Super Admin (superadmin123)
INSERT INTO [dbo].[Users] ([Id], [FullName], [Email], [PasswordHash], [RoleId], [CompanyId], [DepartmentId], [IsActive]) 
VALUES (1, 'Super Admin', 'superadmin@superadmin', '/4wGVGB29KwdeemhsabpfehHVSjN7ZUOI4VxngXBm9k=', 1, NULL, NULL, 1);

-- Empresa 1
-- Admin (adminE1)
INSERT INTO [dbo].[Users] ([Id], [FullName], [Email], [PasswordHash], [RoleId], [CompanyId], [DepartmentId], [IsActive]) 
VALUES (2, 'Admin Empresa 1', 'admin@empresa1.com', 'Bslib7DXnu9HW2HhCj3zK05PEMYjFbi2uBcewT93BSU=', 2, 1, 1, 1);
-- Reviewer (reviewerE1)
INSERT INTO [dbo].[Users] ([Id], [FullName], [Email], [PasswordHash], [RoleId], [CompanyId], [DepartmentId], [IsActive]) 
VALUES (3, 'Reviewer Empresa 1', 'reviewer@empresa1.com', 'IF1GvrY2tjpwtlTpOZE0/4cECk1b9FVAJehompSCbQs=', 3, 1, 1, 1);
-- Redacter (redacterE1)
INSERT INTO [dbo].[Users] ([Id], [FullName], [Email], [PasswordHash], [RoleId], [CompanyId], [DepartmentId], [IsActive]) 
VALUES (4, 'Redacter Empresa 1', 'redacter@empresa1.com', 'MxgaZa9NvAYUrqHflDF3vhuVxYELfWymQpsPd/11Kok=', 4, 1, 2, 1);
-- Operador (operadorE1)
INSERT INTO [dbo].[Users] ([Id], [FullName], [Email], [PasswordHash], [RoleId], [CompanyId], [DepartmentId], [IsActive]) 
VALUES (5, 'Operador Empresa 1', 'operador@empresa1.com', 'Nl1LLlZ4IdWHtSQRmpTNdj11sahLyXkJbQ3R0BMHR50=', 5, 1, 2, 1);

-- Empresa 2
-- Admin (adminE2)
INSERT INTO [dbo].[Users] ([Id], [FullName], [Email], [PasswordHash], [RoleId], [CompanyId], [DepartmentId], [IsActive]) 
VALUES (6, 'Admin Empresa 2', 'admin@empresa2.com', 'GNCYVJdpgcejfFXLlzMPQEtmkENVz77mVQniJ8S5C+g=', 2, 2, 3, 1);
-- Reviewer (reviewerE2)
INSERT INTO [dbo].[Users] ([Id], [FullName], [Email], [PasswordHash], [RoleId], [CompanyId], [DepartmentId], [IsActive]) 
VALUES (7, 'Reviewer Empresa 2', 'reviewer@empresa2.com', '4nhY9Zfr+18CoTCFPtWA5TAICND7IOwrNGT/Z+MV/2A=', 3, 2, 3, 1);
-- Redacter (redacterE2)
INSERT INTO [dbo].[Users] ([Id], [FullName], [Email], [PasswordHash], [RoleId], [CompanyId], [DepartmentId], [IsActive]) 
VALUES (8, 'Redacter Empresa 2', 'redacter@empresa2.com', 'g0pVqb6UFj61MbED8fgFNwRhCxsV+8f2fGxro+uF5LA=', 4, 2, 4, 1);
-- Operador (operadorE2)
INSERT INTO [dbo].[Users] ([Id], [FullName], [Email], [PasswordHash], [RoleId], [CompanyId], [DepartmentId], [IsActive]) 
VALUES (9, 'Operador Empresa 2', 'operador@empresa2.com', 'g/Yp8xf2TUxrHdmAZ61KqTkWVcqxRMwnEv2R20wxbBU=', 5, 2, 4, 1);

SET IDENTITY_INSERT [dbo].[Users] OFF;
GO

USE [master]
GO
ALTER DATABASE [QualityDocDB] SET  READ_WRITE 
GO
