import type { Customer, Loan, Payment } from "@/types";
export const initialCustomers: Customer[] = [
 {id:"CUS-1001",name:"Kasun Perera",nic:"199125601234",dob:"1991-08-12",gender:"Male",address:"No. 24, Temple Road",village:"Maharagama",town:"Maharagama",district:"Colombo",phone:"0771234567",alternatePhone:"",email:"kasun@example.com",occupation:"Shop Owner",monthlyIncome:95000,emergencyContact:"Nimal Perera - 0711234567",guarantor:"Nimal Perera",status:"Active",registeredAt:"2026-09-18"},
 {id:"CUS-1002",name:"Nimali Fernando",nic:"199485601234",dob:"1994-03-21",gender:"Female",address:"18 Lake View",village:"Nugegoda",town:"Nugegoda",district:"Colombo",phone:"0712345678",alternatePhone:"",email:"nimali@example.com",occupation:"Teacher",monthlyIncome:78000,emergencyContact:"Amali - 0721112222",guarantor:"",status:"Active",registeredAt:"2026-09-22"},
 {id:"CUS-1003",name:"Saman Kumara",nic:"198875601234",dob:"1988-11-04",gender:"Male",address:"45 Main Street",village:"Homagama",town:"Homagama",district:"Colombo",phone:"0761234567",alternatePhone:"",email:"",occupation:"Driver",monthlyIncome:65000,emergencyContact:"Kumari - 0771112222",guarantor:"",status:"Active",registeredAt:"2026-10-01"},
 {id:"CUS-1004",name:"Tharushi Silva",nic:"199965601234",dob:"1999-02-17",gender:"Female",address:"12 Station Road",village:"Gampaha",town:"Gampaha",district:"Gampaha",phone:"0759876543",alternatePhone:"",email:"tharushi@example.com",occupation:"Account Assistant",monthlyIncome:82000,emergencyContact:"Silva - 0714445555",guarantor:"",status:"Inactive",registeredAt:"2026-10-03"}
];
export const initialLoans: Loan[] = [
 {id:"LN-2001",customerId:"CUS-1001",principal:150000,capitalDeduction:2000,interestDeduction:0,otherFees:0,interestRate:3,ratePeriod:"Monthly",repaymentFrequency:"Monthly",duration:6,issueDate:"2026-09-20",firstPaymentDate:"2026-10-20",purpose:"Business expansion",status:"Active",interest:27000,totalRepayment:177000,netDisbursement:148000,installment:29500},
 {id:"LN-2002",customerId:"CUS-1002",principal:80000,capitalDeduction:0,interestDeduction:2400,otherFees:500,interestRate:3,ratePeriod:"Monthly",repaymentFrequency:"Monthly",duration:4,issueDate:"2026-09-25",firstPaymentDate:"2026-10-25",purpose:"Home improvement",status:"Pending",interest:9600,totalRepayment:89600,netDisbursement:77100,installment:22400},
 {id:"LN-2003",customerId:"CUS-1003",principal:50000,capitalDeduction:0,interestDeduction:0,otherFees:0,interestRate:2,ratePeriod:"Monthly",repaymentFrequency:"Weekly",duration:12,issueDate:"2026-08-10",firstPaymentDate:"2026-08-17",purpose:"Personal",status:"Overdue",interest:12000,totalRepayment:62000,netDisbursement:50000,installment:5167}
];
export const initialPayments: Payment[] = [
 {id:"PAY-001",loanId:"LN-2001",customerId:"CUS-1001",amount:29500,date:"2026-10-01",type:"Capital"},
 {id:"PAY-002",loanId:"LN-2003",customerId:"CUS-1003",amount:5167,date:"2026-09-30",type:"Interest"}
];
