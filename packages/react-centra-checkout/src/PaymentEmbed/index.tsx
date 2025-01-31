import * as React from 'react'
import isEqual from 'react-fast-compare'
import { useCentraSelection, useCentraHandlers } from '../Context'
import HtmlEmbed from '../internal/HtmlEmbed'

export interface PaymentEmbedProps {
  values: Record<string, unknown>
  onPaymentSuccess?(paymentResult: Centra.CheckoutApi.PaymentResponse): void
  onPaymentError?(error: Record<string, string>): void
}

/** This component handles rendering of payment widgets such as Klarna Checkout and Adyen drop-in, if you submit payments yourself directly,
you should simply call the submitPayment method of the context instead */
const PaymentEmbed = React.memo((props: PaymentEmbedProps): React.ReactElement | null => {
  const { values, onPaymentError, onPaymentSuccess } = props

  const [paymentResult, setPaymentResult] =
    React.useState<Centra.CheckoutApi.PaymentResponse | null>(null)
  const [paymentCallbackError, setPaymentCallbackError] =
    React.useState<Centra.CheckoutApi.ErrorResponse | null>(null)

  const previousPaymentMethod = React.useRef<string | null>(null)

  // Get selection
  const { selection, paymentMethods } = useCentraSelection()
  const { submitPayment } = useCentraHandlers()

  // Get payment method
  const paymentMethodId = selection?.paymentMethod
  const paymentMethod = React.useMemo(
    () => paymentMethods?.find((p) => p.paymentMethod === paymentMethodId),
    [paymentMethods, paymentMethodId],
  )

  // Submit payment
  const handlePaymentCallback = React.useCallback(
    (event) => {
      const {
        addressIncluded,
        billingAddress: detailsAddress,
        shippingAddress: detailsShippingAddress,
        paymentMethod: detailsPaymentMethod,
        paymentMethodSpecificFields,
      } = event.detail

      const payload = {
        address: values.address,
        shippingAddress: values.shippingAddress,
        paymentMethod: detailsPaymentMethod,
        paymentMethodSpecificFields,
        termsAndConditions: values.termsAndConditions,
      } as Record<string, unknown>

      if (addressIncluded) {
        // if address is included in event, send that address instead
        payload.address = detailsAddress
        payload.shippingAddress = detailsShippingAddress
      }

      submitPayment?.(payload)
        .then((result) => {
          if (result?.errors) {
            onPaymentError?.(result.errors)
            // set paymentResult to null so that a new POST /payment request is made to refresh the widget
            setPaymentResult(null)
            setPaymentCallbackError(result.errors)
          } else {
            onPaymentSuccess?.(result)
            setPaymentCallbackError(null)
          }
        })
        .catch((err) => {
          console.error('@noaignite/react-centra-checkout: Could not submit payment')
          setPaymentCallbackError(err)
          console.error(err)
        })
    },
    [submitPayment, onPaymentSuccess, onPaymentError, values],
  )

  // Reset payment result when method changes
  React.useEffect(() => {
    if (selection?.paymentMethod !== previousPaymentMethod.current) {
      setPaymentResult(null)
    }
  }, [selection?.paymentMethod])

  // Retrieve formHtml
  React.useEffect(() => {
    const shouldRequestPayment =
      paymentMethod?.supportsInitiateOnly || paymentMethod?.providesCustomerAddressAfterPayment // if either of these are true, this is a paymentMethod which provides an embed

    if (
      ((selection?.paymentMethod === previousPaymentMethod.current || !shouldRequestPayment) &&
        !paymentCallbackError) ||
      !selection?.paymentMethod
    ) {
      return
    }

    previousPaymentMethod.current = selection?.paymentMethod

    // don't send termsAndConditions when fetching embed payments, as we don't want it to fail just yet.
    submitPayment?.({ ...values, termsAndConditions: undefined })
      .then((result) => {
        if (result?.errors) {
          console.error(result.errors)
          onPaymentError?.(result.errors)
          throw new Error('@noaignite/react-centra-checkout: Error while fetching widget')
        } else if (result.action === 'form' && !result.formHtml) {
          throw new Error('@noaignite/react-centra-checkout: No form to render')
        }

        setPaymentResult(result)
        setPaymentCallbackError(null)
      })
      .catch((err) => {
        console.error(err)
        setPaymentResult(null)
      })
  }, [
    onPaymentError,
    paymentCallbackError,
    paymentMethod,
    selection?.paymentMethod,
    selection?.totals?.grandTotalPriceAsNumber,
    submitPayment,
    values,
  ])

  React.useEffect(() => {
    // Fires when customer submits payment
    document.addEventListener('centra_checkout_payment_callback', handlePaymentCallback)

    return () => {
      document.removeEventListener('centra_checkout_payment_callback', handlePaymentCallback)
    }
  }, [handlePaymentCallback])

  const formHtml = paymentResult?.formHtml

  return formHtml ? <HtmlEmbed id="centra-payment-form" html={formHtml} /> : null
}, isEqual)

export default PaymentEmbed
