"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Search,
  Plus,
  Minus,
  Trash2,
  User,
  ShoppingCart,
  MapPin,
  CreditCard,
  Tag,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PageHeader } from "@/components/shared/PageHeader"
import { useCustomers } from "@/hooks/useCustomers"
import { useProducts } from "@/hooks/useProducts"
import { useDebounce } from "@/hooks/useDebounce"
import { useCreateManualOrder } from "@/hooks/useUploads"
import { formatINR } from "@/lib/utils"
import { usePermissions } from "@/hooks/usePermissions"
import type { Customer } from "@/types/customer.types"
import type { Product } from "@/types/product.types"
import type { DeliveryAddress } from "@/types/order.types"

interface CartItem {
  product: Product
  quantity: number
}

const STEPS = [
  { label: "Customer", icon: User },
  { label: "Products", icon: ShoppingCart },
  { label: "Address", icon: MapPin },
  { label: "Payment", icon: CreditCard },
  { label: "Coupon", icon: Tag },
  { label: "Confirm", icon: CheckCircle2 },
]

export default function NewOrderPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const { can } = usePermissions()
  const canManageOrders = can("orders.manage")

  useEffect(() => {
    if (!canManageOrders) {
      router.replace("/orders")
    }
  }, [canManageOrders, router])

  // Step 1: Customer
  const [customerSearch, setCustomerSearch] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const debouncedCustomerSearch = useDebounce(customerSearch, 400)

  // Step 2: Products
  const [productSearch, setProductSearch] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const debouncedProductSearch = useDebounce(productSearch, 400)

  // Step 3: Address
  const [address, setAddress] = useState<DeliveryAddress>({
    address_line: "",
    city: "",
    state: "",
    pincode: "",
  })

  // Step 4: Payment
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "MANUAL">("MANUAL")

  // Step 5: Coupon
  const [couponCode, setCouponCode] = useState("")

  // Queries
  const { data: customersData } = useCustomers({
    search: debouncedCustomerSearch || undefined,
    limit: 10,
  })
  const { data: productsData } = useProducts({
    search: debouncedProductSearch || undefined,
    limit: 10,
  })

  const createOrder = useCreateManualOrder()

  const customers = customersData?.customers ?? []
  const products = productsData?.products ?? []

  const cartTotal = cart.reduce(
    (sum, item) => sum + (item.product.sale_price ?? item.product.price ?? 0) * item.quantity,
    0
  )

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }, [])

  const updateQuantity = useCallback((productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product.id === productId
            ? { ...i, quantity: Math.max(0, i.quantity + delta) }
            : i
        )
        .filter((i) => i.quantity > 0)
    )
  }, [])

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId))
  }, [])

  if (!canManageOrders) return null

  const canProceed = () => {
    switch (step) {
      case 0: return !!selectedCustomer
      case 1: return cart.length > 0
      case 2: return !!address.city && !!address.pincode
      case 3: return true
      case 4: return true
      case 5: return true
      default: return false
    }
  }

  const handlePlaceOrder = () => {
    if (!selectedCustomer) return
    createOrder.mutate(
      {
        userId: selectedCustomer.id,
        items: cart.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
        paymentMethod,
        deliveryAddress: address as unknown as Record<string, unknown>,
        couponCode: couponCode || undefined,
      },
      {
        onSuccess: () => {
          router.push("/orders")
        },
      }
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/orders")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader title="Create Order" subtitle="Place an order for a customer" />
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const isActive = i === step
          const isDone = i < step
          return (
            <div key={s.label} className="flex items-center gap-1 flex-1">
              <button
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors w-full ${isActive
                    ? "bg-brand-50 text-brand-600 border border-brand-200"
                    : isDone
                      ? "bg-green-50 text-green-600 cursor-pointer hover:bg-green-100"
                      : "bg-muted text-muted-foreground"
                  }`}
              >
                {isDone ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            </div>
          )
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {/* Step 1: Select Customer */}
          {step === 0 && (
            <div className="space-y-4">
              <CardHeader className="p-0">
                <CardTitle className="text-base">Select Customer</CardTitle>
              </CardHeader>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  aria-label="Search customers"
                  placeholder="Search by name or phone..."
                  className="pl-9"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
              </div>
              {selectedCustomer && (
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <User className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {selectedCustomer.name || "Unnamed"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedCustomer.phone} · {selectedCustomer.order_count} orders
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCustomer(null)}
                  >
                    Change
                  </Button>
                </div>
              )}
              {!selectedCustomer && customers.length > 0 && (
                <ScrollArea className="max-h-[320px]">
                  <div className="space-y-1">
                    {customers.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCustomer(c)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted text-left transition-colors"
                      >
                        <div className="h-9 w-9 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 font-semibold text-sm">
                          {(c.name || "?")[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {c.name || "Unnamed Customer"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {c.phone} · {c.order_count} orders · {formatINR(c.total_spent)} spent
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
              {!selectedCustomer && debouncedCustomerSearch && customers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No customers found for &ldquo;{debouncedCustomerSearch}&rdquo;
                </p>
              )}
            </div>
          )}

          {/* Step 2: Add Products */}
          {step === 1 && (
            <div className="space-y-4">
              <CardHeader className="p-0">
                <CardTitle className="text-base">Add Products</CardTitle>
              </CardHeader>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  aria-label="Search products"
                  placeholder="Search products..."
                  className="pl-9"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
              </div>

              {/* Product search results */}
              {productSearch && products.length > 0 && (
                <div className="border rounded-lg max-h-[200px] overflow-y-auto">
                  {products.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className="w-full flex items-center gap-3 p-2.5 hover:bg-muted text-left text-sm border-b last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatINR(p.sale_price ?? p.price ?? 0)} · Stock: {p.stock_quantity}
                        </p>
                      </div>
                      <Plus className="h-4 w-4 text-brand-500 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* Cart */}
              {cart.length > 0 && (
                <>
                  <Separator />
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cart.map((item) => (
                        <TableRow key={item.product.id}>
                          <TableCell className="text-sm font-medium">
                            {item.product.name}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateQuantity(item.product.id, -1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center text-sm font-medium">
                                {item.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateQuantity(item.product.id, 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatINR(item.product.sale_price ?? item.product.price ?? 0)}
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold">
                            {formatINR(
                              (item.product.sale_price ?? item.product.price ?? 0) *
                              item.quantity
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => removeFromCart(item.product.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-sm text-muted-foreground">
                      {cart.reduce((s, i) => s + i.quantity, 0)} items
                    </span>
                    <span className="text-lg font-bold">{formatINR(cartTotal)}</span>
                  </div>
                </>
              )}

              {cart.length === 0 && !productSearch && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Search and add products to the order
                </p>
              )}
            </div>
          )}

          {/* Step 3: Delivery Address */}
          {step === 2 && (
            <div className="space-y-4">
              <CardHeader className="p-0">
                <CardTitle className="text-base">Delivery Address</CardTitle>
              </CardHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Address Line</Label>
                  <Input
                    placeholder="House / Flat / Street"
                    value={address.address_line ?? ""}
                    onChange={(e) =>
                      setAddress((a) => ({ ...a, address_line: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>City *</Label>
                  <Input
                    placeholder="City"
                    value={address.city}
                    onChange={(e) =>
                      setAddress((a) => ({ ...a, city: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>State</Label>
                  <Input
                    placeholder="State"
                    value={address.state ?? ""}
                    onChange={(e) =>
                      setAddress((a) => ({ ...a, state: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Pincode *</Label>
                  <Input
                    placeholder="6-digit pincode"
                    value={address.pincode}
                    onChange={(e) =>
                      setAddress((a) => ({ ...a, pincode: e.target.value }))
                    }
                    maxLength={6}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Payment Method */}
          {step === 3 && (
            <div className="space-y-4">
              <CardHeader className="p-0">
                <CardTitle className="text-base">Payment Method</CardTitle>
              </CardHeader>
              <RadioGroup
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as "COD" | "MANUAL")}
                className="space-y-3"
              >
                <div className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-muted cursor-pointer">
                  <RadioGroupItem value="COD" id="cod" />
                  <Label htmlFor="cod" className="cursor-pointer flex-1">
                    <p className="font-medium">Cash on Delivery</p>
                    <p className="text-xs text-muted-foreground">
                      Customer pays when order is delivered
                    </p>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-muted cursor-pointer">
                  <RadioGroupItem value="MANUAL" id="manual" />
                  <Label htmlFor="manual" className="cursor-pointer flex-1">
                    <p className="font-medium">Manual Payment</p>
                    <p className="text-xs text-muted-foreground">
                      Payment collected manually (cash/UPI/card at counter)
                    </p>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Step 5: Coupon */}
          {step === 4 && (
            <div className="space-y-4">
              <CardHeader className="p-0">
                <CardTitle className="text-base">Apply Coupon (Optional)</CardTitle>
              </CardHeader>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Enter coupon code..."
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="flex-1"
                />
                {couponCode && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCouponCode("")}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty to skip. Coupon validity will be checked server-side.
              </p>
            </div>
          )}

          {/* Step 6: Confirm */}
          {step === 5 && (
            <div className="space-y-4">
              <CardHeader className="p-0">
                <CardTitle className="text-base">Order Summary</CardTitle>
              </CardHeader>

              {/* Customer */}
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {selectedCustomer?.name || "Unnamed"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedCustomer?.phone}
                  </p>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex justify-between text-sm"
                  >
                    <span>
                      {item.product.name} × {item.quantity}
                    </span>
                    <span className="font-medium">
                      {formatINR(
                        (item.product.sale_price ?? item.product.price ?? 0) *
                        item.quantity
                      )}
                    </span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-bold">{formatINR(cartTotal)}</span>
              </div>

              {/* Address */}
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> Delivery Address
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  {address.address_line && `${address.address_line}, `}
                  {address.city}
                  {address.state && `, ${address.state}`}
                  {address.pincode && ` — ${address.pincode}`}
                </p>
              </div>

              {/* Payment + Coupon */}
              <div className="flex items-center gap-4 text-sm">
                <Badge variant="outline">
                  {paymentMethod === "COD" ? "Cash on Delivery" : "Manual Payment"}
                </Badge>
                {couponCode && (
                  <Badge variant="secondary">
                    <Tag className="h-3 w-3 mr-1" />
                    {couponCode}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back
        </Button>

        {step < 5 ? (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canProceed()}
          >
            Next
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        ) : (
          <Button
            onClick={handlePlaceOrder}
            disabled={createOrder.isPending}
            className="bg-brand-500 hover:bg-brand-600"
          >
            {createOrder.isPending ? "Placing..." : "Place Order"}
            <Check className="h-4 w-4 ml-1.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
