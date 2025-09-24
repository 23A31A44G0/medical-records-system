const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

// Connect to the database
const db = new sqlite3.Database('./medical_reports.db');

// First, update the database schema
function updateSchema() {
    return new Promise((resolve, reject) => {
        console.log('Updating database schema...');
        
        // Add new columns if they don't exist
        const alterQueries = [
            `ALTER TABLE patients ADD COLUMN disease_diagnosis TEXT`,
            `ALTER TABLE patients ADD COLUMN city TEXT`,
            `ALTER TABLE patients ADD COLUMN state TEXT`
        ];
        
        let completed = 0;
        const total = alterQueries.length;
        
        alterQueries.forEach((query, index) => {
            db.run(query, (err) => {
                if (err && !err.message.includes('duplicate column')) {
                    console.log(`Error with query ${index + 1}:`, err.message);
                } else {
                    console.log(`✓ Schema update ${index + 1} completed`);
                }
                
                completed++;
                if (completed === total) {
                    console.log('✅ Database schema updated successfully!');
                    resolve();
                }
            });
        });
    });
}

// Sample patients data
const samplePatients = [
    {
        patient_id: 'PAT001',
        first_name: 'John',
        last_name: 'Smith',
        date_of_birth: '1985-03-15',
        gender: 'Male',
        phone: '+1-555-0101',
        email: 'john.smith@email.com',
        address: '123 Main St, Downtown',
        disease_diagnosis: 'Diabetes',
        city: 'New York',
        state: 'New York'
    },
    {
        patient_id: 'PAT002',
        first_name: 'Maria',
        last_name: 'Garcia',
        date_of_birth: '1978-07-22',
        gender: 'Female',
        phone: '+1-555-0102',
        email: 'maria.garcia@email.com',
        address: '456 Oak Ave, Westside',
        disease_diagnosis: 'Hypertension',
        city: 'Los Angeles',
        state: 'California'
    },
    {
        patient_id: 'PAT003',
        first_name: 'David',
        last_name: 'Johnson',
        date_of_birth: '1992-11-08',
        gender: 'Male',
        phone: '+1-555-0103',
        email: 'david.johnson@email.com',
        address: '789 Pine St, Northside',
        disease_diagnosis: 'Asthma',
        city: 'Chicago',
        state: 'Illinois'
    },
    {
        patient_id: 'PAT004',
        first_name: 'Sarah',
        last_name: 'Williams',
        date_of_birth: '1987-05-14',
        gender: 'Female',
        phone: '+1-555-0104',
        email: 'sarah.williams@email.com',
        address: '321 Elm St, Southside',
        disease_diagnosis: 'Heart Disease',
        city: 'Houston',
        state: 'Texas'
    },
    {
        patient_id: 'PAT005',
        first_name: 'Michael',
        last_name: 'Brown',
        date_of_birth: '1975-12-03',
        gender: 'Male',
        phone: '+1-555-0105',
        email: 'michael.brown@email.com',
        address: '654 Maple Dr, Central',
        disease_diagnosis: 'Diabetes',
        city: 'Phoenix',
        state: 'Arizona'
    },
    {
        patient_id: 'PAT006',
        first_name: 'Emily',
        last_name: 'Davis',
        date_of_birth: '1990-09-17',
        gender: 'Female',
        phone: '+1-555-0106',
        email: 'emily.davis@email.com',
        address: '987 Cedar Ln, Eastside',
        disease_diagnosis: 'COVID-19',
        city: 'Miami',
        state: 'Florida'
    },
    {
        patient_id: 'PAT007',
        first_name: 'Robert',
        last_name: 'Miller',
        date_of_birth: '1982-01-25',
        gender: 'Male',
        phone: '+1-555-0107',
        email: 'robert.miller@email.com',
        address: '147 Birch St, Riverside',
        disease_diagnosis: 'Hypertension',
        city: 'Seattle',
        state: 'Washington'
    },
    {
        patient_id: 'PAT008',
        first_name: 'Jennifer',
        last_name: 'Wilson',
        date_of_birth: '1988-06-30',
        gender: 'Female',
        phone: '+1-555-0108',
        email: 'jennifer.wilson@email.com',
        address: '258 Spruce Ave, Hillside',
        disease_diagnosis: 'Pneumonia',
        city: 'Denver',
        state: 'Colorado'
    },
    {
        patient_id: 'PAT009',
        first_name: 'Christopher',
        last_name: 'Moore',
        date_of_birth: '1995-04-12',
        gender: 'Male',
        phone: '+1-555-0109',
        email: 'christopher.moore@email.com',
        address: '369 Willow Way, Lakeside',
        disease_diagnosis: 'Asthma',
        city: 'Portland',
        state: 'Oregon'
    },
    {
        patient_id: 'PAT010',
        first_name: 'Jessica',
        last_name: 'Taylor',
        date_of_birth: '1980-08-19',
        gender: 'Female',
        phone: '+1-555-0110',
        email: 'jessica.taylor@email.com',
        address: '741 Poplar St, Valley View',
        disease_diagnosis: 'Cancer',
        city: 'Boston',
        state: 'Massachusetts'
    },
    {
        patient_id: 'PAT011',
        first_name: 'James',
        last_name: 'Anderson',
        date_of_birth: '1977-02-28',
        gender: 'Male',
        phone: '+1-555-0111',
        email: 'james.anderson@email.com',
        address: '852 Chestnut Rd, Meadowbrook',
        disease_diagnosis: 'Tuberculosis',
        city: 'Atlanta',
        state: 'Georgia'
    },
    {
        patient_id: 'PAT012',
        first_name: 'Amanda',
        last_name: 'Thomas',
        date_of_birth: '1993-10-05',
        gender: 'Female',
        phone: '+1-555-0112',
        email: 'amanda.thomas@email.com',
        address: '963 Ash Blvd, Parkside',
        disease_diagnosis: 'Malaria',
        city: 'New Orleans',
        state: 'Louisiana'
    },
    {
        patient_id: 'PAT013',
        first_name: 'Daniel',
        last_name: 'Jackson',
        date_of_birth: '1986-12-20',
        gender: 'Male',
        phone: '+1-555-0113',
        email: 'daniel.jackson@email.com',
        address: '159 Hickory Ct, Woodland',
        disease_diagnosis: 'Dengue',
        city: 'San Diego',
        state: 'California'
    },
    {
        patient_id: 'PAT014',
        first_name: 'Lisa',
        last_name: 'White',
        date_of_birth: '1989-07-11',
        gender: 'Female',
        phone: '+1-555-0114',
        email: 'lisa.white@email.com',
        address: '753 Sycamore Dr, Brookside',
        disease_diagnosis: 'Diabetes',
        city: 'Las Vegas',
        state: 'Nevada'
    },
    {
        patient_id: 'PAT015',
        first_name: 'Matthew',
        last_name: 'Harris',
        date_of_birth: '1984-03-07',
        gender: 'Male',
        phone: '+1-555-0115',
        email: 'matthew.harris@email.com',
        address: '486 Walnut St, Riverside',
        disease_diagnosis: 'Heart Disease',
        city: 'Detroit',
        state: 'Michigan'
    },
    {
        patient_id: 'PAT016',
        first_name: 'Ashley',
        last_name: 'Martin',
        date_of_birth: '1991-11-23',
        gender: 'Female',
        phone: '+1-555-0116',
        email: 'ashley.martin@email.com',
        address: '297 Beech Ave, Hillcrest',
        disease_diagnosis: 'COVID-19',
        city: 'Phoenix',
        state: 'Arizona'
    },
    {
        patient_id: 'PAT017',
        first_name: 'Kevin',
        last_name: 'Thompson',
        date_of_birth: '1979-06-16',
        gender: 'Male',
        phone: '+1-555-0117',
        email: 'kevin.thompson@email.com',
        address: '108 Magnolia Ln, Sunset',
        disease_diagnosis: 'Hypertension',
        city: 'Dallas',
        state: 'Texas'
    },
    {
        patient_id: 'PAT018',
        first_name: 'Rachel',
        last_name: 'Garcia',
        date_of_birth: '1994-09-02',
        gender: 'Female',
        phone: '+1-555-0118',
        email: 'rachel.garcia@email.com',
        address: '672 Palm St, Oceanview',
        disease_diagnosis: 'Pneumonia',
        city: 'San Francisco',
        state: 'California'
    },
    {
        patient_id: 'PAT019',
        first_name: 'Brandon',
        last_name: 'Martinez',
        date_of_birth: '1981-04-29',
        gender: 'Male',
        phone: '+1-555-0119',
        email: 'brandon.martinez@email.com',
        address: '384 Cypress Rd, Mountain View',
        disease_diagnosis: 'Asthma',
        city: 'Salt Lake City',
        state: 'Utah'
    },
    {
        patient_id: 'PAT020',
        first_name: 'Stephanie',
        last_name: 'Robinson',
        date_of_birth: '1987-01-13',
        gender: 'Female',
        phone: '+1-555-0120',
        email: 'stephanie.robinson@email.com',
        address: '195 Dogwood Dr, Garden District',
        disease_diagnosis: 'Cancer',
        city: 'Minneapolis',
        state: 'Minnesota'
    }
];

// Sample medical reports data
const sampleReports = [
    {
        patient_id: 1,
        report_title: 'Blood Sugar Test Results',
        report_description: 'Quarterly blood glucose monitoring report',
        file_name: 'blood_sugar_report_PAT001.pdf',
        file_path: './uploads/sample-blood-sugar-report.pdf',
        file_type: 'application/pdf',
        file_size: 245760
    },
    {
        patient_id: 2,
        report_title: 'Blood Pressure Monitoring',
        report_description: 'Weekly blood pressure readings and analysis',
        file_name: 'bp_monitoring_PAT002.pdf',
        file_path: './uploads/sample-bp-monitoring.pdf',
        file_type: 'application/pdf',
        file_size: 180240
    },
    {
        patient_id: 3,
        report_title: 'Pulmonary Function Test',
        report_description: 'Lung capacity and breathing assessment',
        file_name: 'lung_test_PAT003.pdf',
        file_path: './uploads/sample-lung-test.pdf',
        file_type: 'application/pdf',
        file_size: 320500
    },
    {
        patient_id: 4,
        report_title: 'Cardiac Stress Test',
        report_description: 'Exercise stress test results and ECG readings',
        file_name: 'cardiac_test_PAT004.pdf',
        file_path: './uploads/sample-cardiac-test.pdf',
        file_type: 'application/pdf',
        file_size: 412800
    },
    {
        patient_id: 5,
        report_title: 'Diabetes Management Plan',
        report_description: 'Updated treatment plan and medication adjustments',
        file_name: 'diabetes_plan_PAT005.txt',
        file_path: './uploads/sample-diabetes-plan.txt',
        file_type: 'text/plain',
        file_size: 15360
    }
];

async function insertSampleData() {
    try {
        console.log('🔄 Starting database setup and sample data insertion...\n');
        
        // First update the schema
        await updateSchema();
        
        console.log('\n📝 Inserting sample patients...');
        
        // Insert sample patients
        const insertPatient = db.prepare(`
            INSERT OR IGNORE INTO patients 
            (patient_id, first_name, last_name, date_of_birth, gender, phone, email, address, disease_diagnosis, city, state, created_by) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `);
        
        for (let i = 0; i < samplePatients.length; i++) {
            const patient = samplePatients[i];
            await new Promise((resolve, reject) => {
                insertPatient.run([
                    patient.patient_id,
                    patient.first_name,
                    patient.last_name,
                    patient.date_of_birth,
                    patient.gender,
                    patient.phone,
                    patient.email,
                    patient.address,
                    patient.disease_diagnosis,
                    patient.city,
                    patient.state
                ], function(err) {
                    if (err) {
                        console.log(`❌ Error inserting patient ${patient.patient_id}:`, err.message);
                        reject(err);
                    } else {
                        console.log(`✅ Inserted: ${patient.first_name} ${patient.last_name} (${patient.disease_diagnosis}, ${patient.city}, ${patient.state})`);
                        resolve();
                    }
                });
            });
        }
        
        insertPatient.finalize();
        
        console.log('\n📄 Inserting sample medical reports...');
        
        // Insert sample reports
        const insertReport = db.prepare(`
            INSERT OR IGNORE INTO medical_reports 
            (patient_id, report_title, report_description, file_name, file_path, file_type, file_size, uploaded_by) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `);
        
        for (let i = 0; i < sampleReports.length; i++) {
            const report = sampleReports[i];
            await new Promise((resolve, reject) => {
                insertReport.run([
                    report.patient_id,
                    report.report_title,
                    report.report_description,
                    report.file_name,
                    report.file_path,
                    report.file_type,
                    report.file_size
                ], function(err) {
                    if (err) {
                        console.log(`❌ Error inserting report for patient ${report.patient_id}:`, err.message);
                        reject(err);
                    } else {
                        console.log(`✅ Inserted report: ${report.report_title}`);
                        resolve();
                    }
                });
            });
        }
        
        insertReport.finalize();
        
        console.log('\n🎉 Sample data insertion completed successfully!\n');
        console.log('📊 Dashboard now includes:');
        console.log('  • 20 patients with various diseases');
        console.log('  • 5 sample medical reports');
        console.log('  • Disease distribution: Diabetes, Hypertension, Asthma, Heart Disease, COVID-19, etc.');
        console.log('  • Geographic spread: Multiple states (NY, CA, IL, TX, FL, WA, etc.)');
        console.log('  • Analytics ready for visualization');
        console.log('\n🌐 Start your server with: npm start');
        console.log('🔗 Then visit: http://localhost:3000');
        console.log('🔑 Login: admin / admin123');
        
    } catch (error) {
        console.error('❌ Error during data insertion:', error);
    } finally {
        db.close();
    }
}

// Run the insertion
insertSampleData();