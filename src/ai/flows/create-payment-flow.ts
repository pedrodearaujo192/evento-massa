
'use server';
/**
 * @fileOverview Fluxo para criação de pagamentos via Mercado Pago.
 *
 * - createPayment - Cria um pagamento (PIX) no Mercado Pago.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import MercadoPagoConfig, { Payment } from 'mercadopago';

// Configuração do Cliente Mercado Pago
// Recomenda-se definir MERCADO_PAGO_ACCESS_TOKEN nas variáveis de ambiente.
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '',
  options: { timeout: 5000 }
});

const CreatePaymentInputSchema = z.object({
  amount: z.number().describe('Valor total do pagamento.'),
  email: z.string().email().describe('E-mail do pagador.'),
  description: z.string().describe('Descrição do pagamento.'),
  fullName: z.string().describe('Nome completo do pagador.'),
  identificationNumber: z.string().describe('CPF do pagador.'),
});

export type CreatePaymentInput = z.infer<typeof CreatePaymentInputSchema>;

export async function createPayment(input: CreatePaymentInput) {
  return createPaymentFlow(input);
}

const createPaymentFlow = ai.defineFlow(
  {
    name: 'createPaymentFlow',
    inputSchema: CreatePaymentInputSchema,
  },
  async (input) => {
    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      throw new Error('MERCADO_PAGO_ACCESS_TOKEN não configurado.');
    }

    const payment = new Payment(client);
    
    // Divide o nome em primeiro e último para o Mercado Pago
    const nameParts = input.fullName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Participante';

    const body = {
      transaction_amount: input.amount,
      description: input.description,
      payment_method_id: 'pix',
      payer: {
        email: input.email,
        first_name: firstName,
        last_name: lastName,
        identification: {
          type: 'CPF',
          number: input.identificationNumber.replace(/\D/g, ''),
        },
      },
    };

    try {
      const response = await payment.create({ body });
      
      return {
        id: response.id,
        status: response.status,
        status_detail: response.status_detail,
        qr_code: response.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: response.point_of_interaction?.transaction_data?.qr_code_base64,
        ticket_url: response.point_of_interaction?.transaction_data?.ticket_url,
      };
    } catch (error: any) {
      console.error('Erro Mercado Pago:', error);
      throw new Error(error.message || 'Erro ao processar pagamento com Mercado Pago.');
    }
  }
);
