import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Fetch all countries from REST Countries API
    const response = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,cca3')
    
    if (!response.ok) {
      throw new Error('Failed to fetch countries')
    }

    const data = await response.json()
    
    // Map to our format
    const countries = data.map((country: any) => ({
      name: country.name.common,
      code: country.cca2,
      cca3: country.cca3,
    })).sort((a: any, b: any) => a.name.localeCompare(b.name))

    return NextResponse.json(countries)
  } catch (error) {
    console.error('Error fetching countries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch countries' },
      { status: 500 }
    )
  }
}

