import { ethers } from "hardhat";

async function main() {
  const [signer, certifier, treasury] = await ethers.getSigners();
  const Factory = await ethers.getContractFactory("HalaalCertification");
  const contract = await Factory.deploy("SANHA", "https://www.sanha.org.za");
  await contract.waitForDeployment();
  const addr = await contract.getAddress();
  console.log("DEPLOYED:", addr);

  // Grant certifier role to the dedicated certifier signer.
  await (await contract.grantRole(await contract.CERTIFIER_ROLE(), certifier.address)).wait();

  const ZA = ethers.encodeBytes32String("ZA").slice(0, 6);
  const tx = await contract.connect(certifier).issueCertificate(
    treasury.address,
    {
      businessName: "Al-Baraka Foods (Pty) Ltd",
      registrationNumber: "2018/034521/07",
      countryCode: ZA,
      businessDataHash: ethers.keccak256(ethers.toUtf8Bytes("pii-record")),
    },
    {
      category: "Food & Beverage",
      productLine: "Processed poultry — all SKUs",
      standard: "SANHA",
      exclusions: ["Imported gelatin"],
    },
    {
      auditorAddress: certifier.address,
      auditorName: "Sheikh Mohammed Al-Rashid",
      auditDocHash: ethers.keccak256(ethers.toUtf8Bytes("audit-v1")),
      ipfsCid: "QmAuditDoc123",
      auditDate: Math.floor(Date.now() / 1000),
    },
    365,
    "ipfs://QmCert1"
  );
  await tx.wait();
  console.log("ISSUED tokenId=1, owner=", await contract.ownerOf(1));

  // Also test revocation path on a second token.
  await (await contract.connect(certifier).issueCertificate(
    treasury.address,
    {
      businessName: "Crescent Bakery",
      registrationNumber: "2019/111222/07",
      countryCode: ZA,
      businessDataHash: ethers.keccak256(ethers.toUtf8Bytes("pii-2")),
    },
    { category: "Food & Beverage", productLine: "Bread", standard: "SANHA", exclusions: [] },
    {
      auditorAddress: certifier.address,
      auditorName: "Sheikh Mohammed Al-Rashid",
      auditDocHash: ethers.keccak256(ethers.toUtf8Bytes("audit-2")),
      ipfsCid: "QmAuditDoc456",
      auditDate: Math.floor(Date.now() / 1000),
    },
    365,
    "ipfs://QmCert2"
  )).wait();
  await (await contract.connect(certifier).revokeCertificate(2, "Non-compliance found")).wait();
  console.log("REVOKED tokenId=2");

  console.log("CONTRACT_ADDRESS=" + addr);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
