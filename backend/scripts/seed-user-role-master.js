const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedUserRoleMaster() {
  console.log('👥 Seeding User Role Master data...');

  const userRoleData = [
    // Core System Roles
    { 
      roleCode: 'SUPER_ADMIN', 
      roleName: 'Super Administrator', 
      permissions: ['*'], 
      description: 'Full system access with all permissions' 
    },
    { 
      roleCode: 'ADMIN', 
      roleName: 'Administrator', 
      permissions: [
        'user_mgmt',
        'party_mgmt',
        'service_mgmt',
        'master_mgmt',
        'reporting',
        'sys_config',
        'audit_logs'
      ], 
      description: 'Administrative access to most system functions' 
    },
    { 
      roleCode: 'STAFF', 
      roleName: 'Staff Member', 
      permissions: [
        'party_mgmt',
        'service_mgmt',
        'booking_mgmt',
        'doc_mgmt',
        'basic_reports'
      ], 
      description: 'Staff level access for daily operations' 
    },
    { 
      roleCode: 'PARTY', 
      roleName: 'Party User', 
      permissions: [
        'view_bookings',
        'create_bookings',
        'upload_docs',
        'view_invoices',
        'update_profile'
      ], 
      description: 'Party user access for booking and profile management' 
    },

    // Specialized Roles
    { 
      roleCode: 'BOOKING_MANAGER', 
      roleName: 'Booking Manager', 
      permissions: [
        'booking_mgmt',
        'service_mgmt',
        'party_mgmt',
        'transport_mgmt',
        'accommodation_mgmt',
        'booking_reports'
      ], 
      description: 'Specialized role for booking management' 
    },
    { 
      roleCode: 'FINANCE_MANAGER', 
      roleName: 'Finance Manager', 
      permissions: [
        'financial_reports',
        'invoice_mgmt',
        'payment_mgmt',
        'financial_analytics',
        'budget_mgmt'
      ], 
      description: 'Financial management and reporting role' 
    },
    { 
      roleCode: 'CUSTOMER_SERVICE', 
      roleName: 'Customer Service', 
      permissions: [
        'party_mgmt',
        'booking_support',
        'doc_assistance',
        'customer_comm',
        'issue_resolution'
      ], 
      description: 'Customer service and support role' 
    },
    { 
      roleCode: 'DOCUMENT_SPECIALIST', 
      roleName: 'Document Specialist', 
      permissions: [
        'doc_mgmt',
        'doc_verification',
        'doc_processing',
        'doc_reports'
      ], 
      description: 'Specialized role for document handling' 
    },
    { 
      roleCode: 'TRANSPORT_COORDINATOR', 
      roleName: 'Transport Coordinator', 
      permissions: [
        'transport_mgmt',
        'transport_booking',
        'transport_scheduling',
        'transport_reports'
      ], 
      description: 'Transportation coordination role' 
    },
    { 
      roleCode: 'ACCOMMODATION_COORDINATOR', 
      roleName: 'Accommodation Coordinator', 
      permissions: [
        'accommodation_mgmt',
        'hotel_booking',
        'accommodation_scheduling',
        'accommodation_reports'
      ], 
      description: 'Accommodation coordination role' 
    },

    // Read-Only Roles
    { 
      roleCode: 'REPORT_VIEWER', 
      roleName: 'Report Viewer', 
      permissions: [
        'view_reports',
        'export_reports',
        'dashboard_access'
      ], 
      description: 'Read-only access to reports and dashboards' 
    },
    { 
      roleCode: 'AUDITOR', 
      roleName: 'Auditor', 
      permissions: [
        'audit_logs',
        'system_reports',
        'compliance_reports',
        'read_only_access'
      ], 
      description: 'Audit and compliance review role' 
    },

    // Limited Access Roles
    { 
      roleCode: 'GUEST', 
      roleName: 'Guest User', 
      permissions: [
        'view_public_info',
        'contact_support'
      ], 
      description: 'Limited guest access' 
    },
    { 
      roleCode: 'TEMP_STAFF', 
      roleName: 'Temporary Staff', 
      permissions: [
        'basic_booking_mgmt',
        'doc_upload',
        'limited_reporting'
      ], 
      description: 'Temporary staff with limited access' 
    },

    // Department-Specific Roles
    { 
      roleCode: 'SALES_MANAGER', 
      roleName: 'Sales Manager', 
      permissions: [
        'party_mgmt',
        'sales_reports',
        'customer_mgmt',
        'booking_mgmt',
        'sales_analytics'
      ], 
      description: 'Sales management and customer relationship role' 
    },
    { 
      roleCode: 'OPERATIONS_MANAGER', 
      roleName: 'Operations Manager', 
      permissions: [
        'service_mgmt',
        'operational_reports',
        'process_mgmt',
        'quality_control',
        'staff_coordination'
      ], 
      description: 'Operations and process management role' 
    },
    { 
      roleCode: 'IT_SUPPORT', 
      roleName: 'IT Support', 
      permissions: [
        'system_maintenance',
        'user_support',
        'technical_reports',
        'system_monitoring'
      ], 
      description: 'IT support and maintenance role' 
    },
  ];

  for (const data of userRoleData) {
    await prisma.userRoleMaster.upsert({
      where: { roleCode: data.roleCode },
      update: data,
      create: data,
    });
  }

  console.log(`✅ Created ${userRoleData.length} user role master records`);
  console.log('👥 User Role Master seeding completed successfully!');
}

seedUserRoleMaster()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
