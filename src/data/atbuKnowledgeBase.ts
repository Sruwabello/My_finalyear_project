export interface KBChunk {
  id: string;
  category: "Admission & Screening" | "Fees & Payments" | "Documents Checklist" | "Course Registration & Matriculation";
  title: string;
  content: string;
  metadata: {
    source: string;
    session: string;
    keywords: string[];
  };
}

export const ATBU_SESSION_YEAR = "2025/2026";

export const ATBU_KNOWLEDGE_BASE: KBChunk[] = [
  {
    id: "kb-001",
    category: "Admission & Screening",
    title: "Admission Verification & Portal Activation",
    content: `All newly admitted students into Abubakar Tafawa Balewa University (ATBU), Bauchi must first verify their admission on the Joint Admissions and Matriculation Board (JAMB) Central Admissions Processing System (CAPS). 
Once you accept your admission on JAMB CAPS, proceed to the official ATBU Portal (https://portal.atbu.edu.ng). 
Click on the 'Fresh Student' tab and enter your JAMB Registration Number as both username and password (you will be prompted to change your password immediately upon first login). 
Generate your Admission Letter and payment invoice for online screening. Ensure your details match your O'Level certificates exactly before completing portal activation.`,
    metadata: {
      source: "ATBU Academic Office",
      session: ATBU_SESSION_YEAR,
      keywords: ["jamb", "caps", "admission", "portal", "login", "activation", "password"]
    }
  },
  {
    id: "kb-002",
    category: "Admission & Screening",
    title: "Online Screening Procedure",
    content: `Before coming to the physical campus, all fresh students must undergo online screening on the ATBU portal.
1. Log in to your portal profile at portal.atbu.edu.ng.
2. Upload scanned copies of your original credentials. These include:
   - JAMB Admission Letter and JAMB Result Slip.
   - ATBU Admission Letter.
   - O'Level results (WAEC, NECO, or NABTEB) in PDF format. A maximum of two (2) sittings is permitted.
   - Primary School Leaving Certificate.
   - Certificate of Local Government Indigene/Origin.
   - Birth Certificate or Declaration of Age.
   - Standard Passport Photograph with a white background.
3. Submit for online clearance. Your documents will be reviewed by the faculty screening officers within 48-72 hours. Check your portal status regularly. Once cleared, you will receive an 'Online Clearance Approved' status and be eligible for physical screening.`,
    metadata: {
      source: "Faculty Screening Board",
      session: ATBU_SESSION_YEAR,
      keywords: ["online screening", "screening", "upload", "credentials", "clearance", "waec", "neco"]
    }
  },
  {
    id: "kb-003",
    category: "Admission & Screening",
    title: "Physical Screening & Campus Locations",
    content: `After obtaining Online Clearance Approval, fresh students must proceed to their respective campuses for physical screening and credentials verification.
- Gubi Campus (along Kano Road, Bauchi): Faculties of Agriculture, Management Sciences, Computing, Science, Technology Education, Joint College of Medicine, and Veterinary Medicine.
- Yelwa Campus (within Bauchi metropolitan): Faculties of Environmental Technology and Engineering.
What to bring:
Proceed to the designated Faculty Screening Room with a green cardboard file containing:
- Original and three (3) photocopies of all uploaded credentials.
- Online Screening Clearance Printout.
- Eight (8) recent colored passport-sized photographs.
- Completed and signed screening forms printed from the portal.
The Screening Officer will inspect your original documents. If satisfied, they will sign your physical clearance form, which clears you to make school fee payments.`,
    metadata: {
      source: "Registrar's Office",
      session: ATBU_SESSION_YEAR,
      keywords: ["physical screening", "gubi campus", "yelwa campus", "green file", "faculties", "verification"]
    }
  },
  {
    id: "kb-004",
    category: "Fees & Payments",
    title: "Generating Remita RRR & Safe Payments",
    content: `All payments at Abubakar Tafawa Balewa University (ATBU) must be processed through the Remita platform using the Remita Retrieval Reference (RRR) generated directly from your student portal.
To make a payment safely:
1. Log in to portal.atbu.edu.ng.
2. Navigate to the 'Fees' or 'Payments' section and select the fee type (Screening Fee, School Fees, or Hostel Fee).
3. Click 'Generate Invoice' to produce your RRR number.
4. Payment options:
   - Online Payment: Click 'Pay Now' to use your debit card (Mastercard, Visa, Verve) or internet banking.
   - Bank Payment: Print the invoice with the RRR code and walk into any commercial bank nationwide to make cash payments.
WARNING: Never pay cash to any staff, student representative, or third-party cafe operator. Only make payments through your official portal using the RRR number. Always print your official university receipt from the portal immediately after payment.`,
    metadata: {
      source: "Bursary Department",
      session: ATBU_SESSION_YEAR,
      keywords: ["remita", "rrr", "invoice", "payment", "bank", "receipt", "bursary", "scam warning"]
    }
  },
  {
    id: "kb-005",
    category: "Fees & Payments",
    title: "Fresh Students School Fees Schedule",
    content: `School fees at ATBU are split by faculty and state of origin (indigene versus non-indigene status). Below is the official schedule of registration fees for fresh students:
1. Faculty of Science, Technology Education, and Agriculture:
   - State Indigenes: NGN 71,500 per session.
   - Non-Indigenes: NGN 106,500 per session.
2. Faculty of Engineering and Environmental Technology:
   - State Indigenes: NGN 79,500 per session.
   - Non-Indigenes: NGN 114,500 per session.
3. College of Medicine (MBBS) / Veterinary Medicine:
   - State Indigenes: NGN 94,500 per session.
   - Non-Indigenes: NGN 134,500 per session.
4. Faculty of Management Sciences:
   - State Indigenes: NGN 64,500 per session.
   - Non-Indigenes: NGN 94,500 per session.
Other compulsory fees to budget for:
- Student Union Government (SUG) Dues: NGN 2,000 (paid once).
- Faculty and Departmental association dues: NGN 1,500 - NGN 3,000 (depending on department).
- Medical Screening Fee: NGN 3,500 (paid at University Clinic).
Note: All fees are non-refundable once paid and must be completed before you can register your courses.`,
    metadata: {
      source: "Bursary Department",
      session: ATBU_SESSION_YEAR,
      keywords: ["school fees", "indigene", "non-indigene", "schedule", "amount", "engineering", "science", "medicine", "sug"]
    }
  },
  {
    id: "kb-006",
    category: "Fees & Payments",
    title: "Accommodation & Hostel Allocation",
    content: `Hostel accommodation at ATBU is available to fresh students on a first-come, first-served basis, with priority given to female students and medical students.
Hostel Fee: NGN 15,000 per session (excluding a refundable caution deposit of NGN 3,000).
How to apply:
1. Complete your school fees payment and secure your clearance receipt.
2. Log in to the portal and click on 'Accommodation Application'.
3. Select your preferred campus hostel block (if available).
4. If allocated a slot, generate the Remita invoice, make the payment of NGN 18,000 (including caution fee) using your RRR, and print your Hostel Allocation Slip.
5. Take the Allocation Slip to the Hall Warden at Gubi Campus (for Gubi hostels) or Yelwa Campus (for Yelwa hostels) for physical bed space allocation.
Cooking inside the rooms is strictly prohibited, and illegal transfers of bed spaces will result in immediate suspension.`,
    metadata: {
      source: "Student Affairs Division",
      session: ATBU_SESSION_YEAR,
      keywords: ["hostel", "accommodation", "room", "bedspace", "allocation", "female", "warden"]
    }
  },
  {
    id: "kb-007",
    category: "Documents Checklist",
    title: "Complete Document Verification Checklist",
    content: `To ensure a smooth physical screening, assemble the following documents in your green credentials file. All documents must be original and arranged in the following order:
1. Original JAMB Admission Letter (Institution Copy - coloured print).
2. ATBU Admission Letter (printed from portal).
3. JAMB Result Slip (showing score and photo).
4. O'Level Certificate(s) - WAEC, NECO, or NABTEB statement of result or certificate. Online printout is acceptable if the certificate is not yet issued.
5. Primary School Leaving Certificate or testimonial.
6. Local Government Indigene Certificate (must be signed and stamped by your local government secretariat).
7. Birth Certificate from National Population Commission (NPC) or a valid court Declaration of Age.
8. Medical Fitness Certificate from the ATBU University Health Centre (Yelwa or Gubi campus clinic).
9. Online screening clearance printout.
10. Proof of payment receipt for screening fees.
Make three (3) sets of clean photocopies of all these items before submitting them to your faculty's screening officer.`,
    metadata: {
      source: "Academic Registry",
      session: ATBU_SESSION_YEAR,
      keywords: ["checklist", "documents", "jamb admission", "indigene certificate", "birth certificate", "medical clearance"]
    }
  },
  {
    id: "kb-008",
    category: "Course Registration & Matriculation",
    title: "Course Registration Procedure (Form 01)",
    content: `Once your school fees payment is approved, your matriculation number will be generated on your portal profile. You can then perform course registration:
1. Log in to the portal with your newly assigned Matriculation Number.
2. Click on 'Course Registration' under the registration menu.
3. Consult your Level Coordinator or Departmental handbook to know the compulsory, elective, and general (GST) courses for the semester.
4. Tick the appropriate courses and click 'Submit' (make sure total credit units fall within the approved range, typically 12 to 24 units per semester).
5. Print four (4) copies of the Course Registration Form (Form 01).
6. Take the printed forms to your Level Coordinator, Head of Department (HOD), and Dean of Faculty for endorsement signatures.
7. Distribute signed copies to: Your Department, your Faculty Office, the Academic Office, and keep one copy as your personal receipt.
Course registration must be completed within three (3) weeks of resumption. Late registration attracts a fine of NGN 5,000.`,
    metadata: {
      source: "Academic Office",
      session: ATBU_SESSION_YEAR,
      keywords: ["course registration", "form 01", "level coordinator", "credit units", "late registration", "gst", "courses"]
    }
  },
  {
    id: "kb-009",
    category: "Course Registration & Matriculation",
    title: "Matriculation and Student Identity Cards",
    content: `Matriculation is the official ceremony welcoming fresh students into Abubakar Tafawa Balewa University (ATBU). Only students who have completed screening, paid fees, and registered their courses are eligible to matriculate.
- Gowns: Matriculation gowns are rented from the Faculty Officers at a cost of NGN 1,500, paid via the portal.
- Matriculation Oath: During the ceremony, you will take the matriculation oath and sign the Matriculation Register, making you a full legal member of the university.
- Student ID Cards: Digital Student ID Cards are processed by the ICT Directorate.
  - Log in to your portal.
  - Upload a clear passport photo (must be a JPEG, clear lighting, blue/white background).
  - Go to Yelwa Campus ICT Directorate (near the library) or the Gubi ICT center to collect your biometrics-enabled physical student identity card once printed.
Your student ID card is required to gain entry into lecture halls, computer labs, examination halls, and the university library.`,
    metadata: {
      source: "ICT Directorate & Registrar",
      session: ATBU_SESSION_YEAR,
      keywords: ["matriculation", "gown", "oath", "register", "id card", "ict", "biometrics"]
    }
  }
];
