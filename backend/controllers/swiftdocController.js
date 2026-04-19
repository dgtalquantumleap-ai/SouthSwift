const axios = require('axios');

/**
 * SwiftDoc — powered by Signova API
 * Generates legally binding tenancy agreements for every SouthSwift deal
 */
const generateSwiftDoc = async ({ deal, listing, tenant, agent }) => {
  try {
    // ── SIGNOVA API INTEGRATION ───────────────────────────────────────────
    // Fill in when Signova CEO provides API documentation
    if (process.env.SIGNOVA_API_KEY && process.env.SIGNOVA_API_KEY !== 'FILL_IN_WHEN_SIGNOVA_CEO_PROVIDES') {

      const response = await axios.post(
        `${process.env.SIGNOVA_BASE_URL}/v1/documents/generate`,
        {
          template_type:  'residential_tenancy',
          jurisdiction:   'NG',
          state:          listing.state,
          parties: {
            tenant: {
              name:  tenant.full_name,
              phone: tenant.phone,
              email: tenant.email,
            },
            landlord: {
              name:  agent.full_name,
              phone: agent.phone,
              email: agent.email,
            },
          },
          property: {
            address:       listing.address,
            city:          listing.city,
            state:         listing.state,
            property_type: listing.property_type,
            bedrooms:      listing.bedrooms,
          },
          terms: {
            rent_amount:       deal.rent_amount,
            currency:          'NGN',
            rent_period:       listing.rent_period || 'yearly',
            lease_duration:    deal.lease_duration_months,
            move_in_date:      deal.move_in_date,
            escrow_reference:  deal.paystack_reference,
            platform:          'SouthSwift SwiftShield',
          },
          output_format: 'pdf',
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.SIGNOVA_API_KEY}`,
            'Content-Type':  'application/json',
          },
          timeout: 30000,
        }
      );

      return response.data.document_url || response.data.url || null;
    }

    // ── FALLBACK — Generate basic agreement without Signova ───────────────
    // Used when Signova API key is not yet configured
    console.log('⚠️  Signova API not configured — using placeholder SwiftDoc');
    return generateFallbackDoc({ deal, listing, tenant, agent });

  } catch (err) {
    console.error('SwiftDoc generation failed:', err.message);
    return generateFallbackDoc({ deal, listing, tenant, agent });
  }
};

// Fallback document URL — returns a pre-built template link
// Replace this with actual PDF generation once Signova API is live
const generateFallbackDoc = async ({ deal, listing, tenant, agent }) => {
  // Returns a data URL string describing the document
  // In production this should upload to Cloudinary and return the URL
  const docData = {
    agreement_type: 'RESIDENTIAL TENANCY AGREEMENT',
    platform:       'SouthSwift Enterprise — SwiftShield Protected',
    deal_id:        deal.id,
    date:           new Date().toLocaleDateString('en-NG'),
    tenant: {
      name:  tenant.full_name,
      phone: tenant.phone,
      email: tenant.email,
    },
    landlord_agent: {
      name:  agent.full_name,
      phone: agent.phone,
    },
    property: {
      address: listing.address,
      city:    listing.city,
      state:   listing.state,
      type:    listing.property_type,
    },
    financial: {
      rent:         `₦${deal.rent_amount.toLocaleString()}`,
      duration:     `${deal.lease_duration_months} months`,
      escrow_ref:   deal.paystack_reference,
      swiftshield:  'Funds protected by SouthSwift SwiftShield Escrow',
    },
    status: 'PENDING_SIGNOVA_INTEGRATION',
  };

  console.log('📋 SwiftDoc (fallback):', JSON.stringify(docData, null, 2));
  return `https://southswift.com.ng/docs/pending/${deal.id}`;
};

module.exports = { generateSwiftDoc };
