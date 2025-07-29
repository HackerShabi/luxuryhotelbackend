const emailTemplates = {
  // Booking confirmation email
  bookingConfirmation: (booking) => {
    return {
      subject: `Booking Confirmation - ${booking.confirmationNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Booking Confirmed!</h1>
            <p style="color: #e8f4fd; margin: 10px 0 0 0; font-size: 16px;">Thank you for choosing Luxury Hotel</p>
          </div>
          
          <div style="padding: 30px; background-color: white;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <h2 style="color: #333; margin: 0 0 15px 0; font-size: 20px;">Booking Details</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Confirmation Number:</td>
                  <td style="padding: 8px 0; color: #333;">${booking.confirmationNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Room:</td>
                  <td style="padding: 8px 0; color: #333;">${booking.room?.name || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Check-in:</td>
                  <td style="padding: 8px 0; color: #333;">${new Date(booking.checkInDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Check-out:</td>
                  <td style="padding: 8px 0; color: #333;">${new Date(booking.checkOutDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Guests:</td>
                  <td style="padding: 8px 0; color: #333;">${booking.numberOfGuests}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Nights:</td>
                  <td style="padding: 8px 0; color: #333;">${booking.numberOfNights}</td>
                </tr>
              </table>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Guest Information</h3>
              <p style="margin: 5px 0; color: #333;"><strong>Name:</strong> ${booking.guestInfo.firstName} ${booking.guestInfo.lastName}</p>
              <p style="margin: 5px 0; color: #333;"><strong>Email:</strong> ${booking.guestInfo.email}</p>
              <p style="margin: 5px 0; color: #333;"><strong>Phone:</strong> ${booking.guestInfo.phone}</p>
              ${booking.guestInfo.specialRequests ? `<p style="margin: 5px 0; color: #333;"><strong>Special Requests:</strong> ${booking.guestInfo.specialRequests}</p>` : ''}
            </div>
            
            <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745;">
              <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Payment Summary</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 5px 0; color: #666;">Room Rate (${booking.numberOfNights} nights):</td>
                  <td style="padding: 5px 0; color: #333; text-align: right;">$${booking.pricing.subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #666;">Taxes & Fees:</td>
                  <td style="padding: 5px 0; color: #333; text-align: right;">$${(booking.pricing.taxes + booking.pricing.fees).toFixed(2)}</td>
                </tr>
                <tr style="border-top: 2px solid #28a745;">
                  <td style="padding: 10px 0 5px 0; color: #333; font-weight: bold; font-size: 16px;">Total Amount:</td>
                  <td style="padding: 10px 0 5px 0; color: #28a745; text-align: right; font-weight: bold; font-size: 16px;">$${booking.pricing.totalAmount.toFixed(2)}</td>
                </tr>
              </table>
            </div>
            
            <div style="margin: 30px 0; text-align: center;">
              <h3 style="color: #333; margin-bottom: 15px;">Important Information</h3>
              <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; text-align: left;">
                <ul style="margin: 0; padding-left: 20px; color: #856404;">
                  <li>Check-in time: 3:00 PM</li>
                  <li>Check-out time: 11:00 AM</li>
                  <li>Please bring a valid ID for check-in</li>
                  <li>Free cancellation up to 24 hours before check-in</li>
                  <li>Contact us for any special arrangements</li>
                </ul>
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #666; margin-bottom: 20px;">Need to make changes or have questions?</p>
              <a href="tel:+1234567890" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 0 10px;">Call Us</a>
              <a href="mailto:info@luxuryhotel.com" style="display: inline-block; background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 0 10px;">Email Us</a>
            </div>
          </div>
          
          <div style="background-color: #343a40; padding: 20px; text-align: center;">
            <p style="color: #adb5bd; margin: 0; font-size: 14px;">Thank you for choosing Luxury Hotel. We look forward to hosting you!</p>
            <p style="color: #6c757d; margin: 10px 0 0 0; font-size: 12px;">© 2024 Luxury Hotel. All rights reserved.</p>
          </div>
        </div>
      `
    }
  },

  // Booking cancellation email
  bookingCancellation: (booking) => {
    return {
      subject: `Booking Cancelled - ${booking.confirmationNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa;">
          <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Booking Cancelled</h1>
            <p style="color: #f8d7da; margin: 10px 0 0 0; font-size: 16px;">Your reservation has been cancelled</p>
          </div>
          
          <div style="padding: 30px; background-color: white;">
            <p style="color: #333; font-size: 16px; margin-bottom: 20px;">Dear ${booking.guestInfo.firstName},</p>
            <p style="color: #333; margin-bottom: 20px;">Your booking with confirmation number <strong>${booking.confirmationNumber}</strong> has been successfully cancelled.</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin: 0 0 15px 0;">Cancelled Booking Details</h3>
              <p><strong>Room:</strong> ${booking.room?.name || 'N/A'}</p>
              <p><strong>Check-in:</strong> ${new Date(booking.checkInDate).toLocaleDateString()}</p>
              <p><strong>Check-out:</strong> ${new Date(booking.checkOutDate).toLocaleDateString()}</p>
              <p><strong>Total Amount:</strong> $${booking.pricing.totalAmount.toFixed(2)}</p>
            </div>
            
            ${booking.cancellation?.refundAmount ? `
              <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0;">
                <h3 style="color: #155724; margin: 0 0 10px 0;">Refund Information</h3>
                <p style="color: #155724; margin: 5px 0;"><strong>Refund Amount:</strong> $${booking.cancellation.refundAmount.toFixed(2)}</p>
                <p style="color: #155724; margin: 5px 0;"><strong>Processing Time:</strong> 3-5 business days</p>
                <p style="color: #155724; margin: 5px 0;">The refund will be credited to your original payment method.</p>
              </div>
            ` : ''}
            
            <p style="color: #333; margin: 20px 0;">We're sorry to see you cancel your reservation. We hope to welcome you at Luxury Hotel in the future.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/rooms" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">Book Again</a>
            </div>
          </div>
          
          <div style="background-color: #343a40; padding: 20px; text-align: center;">
            <p style="color: #adb5bd; margin: 0; font-size: 14px;">Thank you for considering Luxury Hotel</p>
            <p style="color: #6c757d; margin: 10px 0 0 0; font-size: 12px;">© 2024 Luxury Hotel. All rights reserved.</p>
          </div>
        </div>
      `
    }
  },

  // Contact form response
  contactResponse: (contact, response) => {
    return {
      subject: `Re: ${contact.subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Response to Your Inquiry</h1>
          </div>
          
          <div style="padding: 30px; background-color: white;">
            <p style="color: #333; font-size: 16px;">Dear ${contact.name},</p>
            <p style="color: #333; margin-bottom: 20px;">Thank you for contacting Luxury Hotel. Here's our response to your inquiry:</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin: 0 0 10px 0;">Your Original Message:</h3>
              <p style="color: #666; font-style: italic;">${contact.message}</p>
            </div>
            
            <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0;">
              <h3 style="color: #155724; margin: 0 0 15px 0;">Our Response:</h3>
              <div style="color: #333; line-height: 1.6;">${response}</div>
            </div>
            
            <p style="color: #333; margin: 20px 0;">If you have any additional questions, please don't hesitate to contact us.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="tel:+1234567890" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 0 10px;">Call Us</a>
              <a href="mailto:info@luxuryhotel.com" style="display: inline-block; background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 0 10px;">Email Us</a>
            </div>
          </div>
          
          <div style="background-color: #343a40; padding: 20px; text-align: center;">
            <p style="color: #adb5bd; margin: 0; font-size: 14px;">Best regards, The Luxury Hotel Team</p>
          </div>
        </div>
      `
    }
  },

  // Welcome email for new users
  welcome: (user) => {
    return {
      subject: 'Welcome to Luxury Hotel',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Luxury Hotel!</h1>
            <p style="color: #e8f4fd; margin: 10px 0 0 0; font-size: 16px;">Your journey to luxury begins here</p>
          </div>
          
          <div style="padding: 30px; background-color: white;">
            <p style="color: #333; font-size: 16px;">Dear ${user.firstName},</p>
            <p style="color: #333; margin-bottom: 20px;">Welcome to the Luxury Hotel family! We're thrilled to have you join our community of discerning travelers.</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin: 0 0 15px 0;">What you can do now:</h3>
              <ul style="color: #333; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li>Browse our luxury rooms and suites</li>
                <li>Make reservations with exclusive member rates</li>
                <li>Access your booking history and preferences</li>
                <li>Receive personalized offers and recommendations</li>
                <li>Enjoy priority customer support</li>
              </ul>
            </div>
            
            <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0;">
              <h3 style="color: #155724; margin: 0 0 10px 0;">Member Benefits:</h3>
              <p style="color: #155724; margin: 5px 0;">✓ Early access to special promotions</p>
              <p style="color: #155724; margin: 5px 0;">✓ Complimentary room upgrades (subject to availability)</p>
              <p style="color: #155724; margin: 5px 0;">✓ Late check-out privileges</p>
              <p style="color: #155724; margin: 5px 0;">✓ Exclusive member-only events</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/rooms" style="display: inline-block; background-color: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 16px;">Explore Our Rooms</a>
            </div>
            
            <p style="color: #333; margin: 20px 0;">If you have any questions or need assistance, our concierge team is available 24/7 to help you.</p>
          </div>
          
          <div style="background-color: #343a40; padding: 20px; text-align: center;">
            <p style="color: #adb5bd; margin: 0; font-size: 14px;">Thank you for choosing Luxury Hotel</p>
            <p style="color: #6c757d; margin: 10px 0 0 0; font-size: 12px;">© 2024 Luxury Hotel. All rights reserved.</p>
          </div>
        </div>
      `
    }
  },

  // Newsletter subscription confirmation
  newsletterWelcome: (email) => {
    return {
      subject: 'Welcome to Our Newsletter!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">You're In!</h1>
            <p style="color: #d4edda; margin: 10px 0 0 0; font-size: 16px;">Welcome to our exclusive newsletter</p>
          </div>
          
          <div style="padding: 30px; background-color: white;">
            <p style="color: #333; font-size: 16px;">Thank you for subscribing to the Luxury Hotel newsletter!</p>
            <p style="color: #333; margin-bottom: 20px;">You'll now be the first to know about:</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <ul style="color: #333; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li>🎉 Exclusive deals and special offers</li>
                <li>🏨 New room types and amenities</li>
                <li>🌟 VIP events and experiences</li>
                <li>✈️ Travel tips and destination guides</li>
                <li>📅 Seasonal promotions and packages</li>
              </ul>
            </div>
            
            <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
              <p style="color: #856404; margin: 0; font-weight: bold;">🎁 Welcome Bonus!</p>
              <p style="color: #856404; margin: 10px 0 0 0;">Use code <strong>WELCOME10</strong> for 10% off your next booking!</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/rooms" style="display: inline-block; background-color: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 16px;">Book Now & Save</a>
            </div>
          </div>
          
          <div style="background-color: #343a40; padding: 20px; text-align: center;">
            <p style="color: #adb5bd; margin: 0; font-size: 14px;">Stay tuned for amazing content!</p>
            <p style="color: #6c757d; margin: 10px 0 0 0; font-size: 12px;">© 2024 Luxury Hotel. All rights reserved.</p>
          </div>
        </div>
      `
    }
  },

  // Admin notification for new contact
  adminContactNotification: (contact) => {
    return {
      subject: `New Contact Form Submission - ${contact.inquiryType}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #007bff; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">New Contact Form Submission</h1>
          </div>
          
          <div style="padding: 20px; background-color: white;">
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="margin: 0 0 10px 0; color: #333;">Contact Details</h3>
              <p><strong>Name:</strong> ${contact.name}</p>
              <p><strong>Email:</strong> ${contact.email}</p>
              <p><strong>Phone:</strong> ${contact.phone || 'Not provided'}</p>
              <p><strong>Inquiry Type:</strong> ${contact.inquiryType}</p>
              <p><strong>Subject:</strong> ${contact.subject}</p>
              <p><strong>Priority:</strong> <span style="color: ${contact.priority === 'high' ? '#dc3545' : contact.priority === 'medium' ? '#ffc107' : '#28a745'}; font-weight: bold;">${contact.priority.toUpperCase()}</span></p>
            </div>
            
            <div style="background-color: #e9ecef; padding: 15px; border-radius: 8px;">
              <h3 style="margin: 0 0 10px 0; color: #333;">Message</h3>
              <p style="color: #333; line-height: 1.6;">${contact.message}</p>
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
              <a href="${process.env.FRONTEND_URL}/admin?section=contacts" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">View in Admin Panel</a>
            </div>
          </div>
        </div>
      `
    }
  }
}

module.exports = emailTemplates