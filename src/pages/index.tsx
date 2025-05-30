import type {ReactNode} from 'react'
import { styled } from "styled-components"
import Link from '@docusaurus/Link'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import {type ColorMode, useColorMode} from '@docusaurus/theme-common'
import { ColorModeProvider } from '@docusaurus/theme-common/internal'
import Layout from '@theme/Layout'
import Heading from '@theme/Heading'

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext()
  
  return (
    <ColorModeProvider>
      <Layout
        title={siteConfig.title}
        description="Description will go into a meta tag in <head />">

        <StyledWrapper>
          <Hero />
          <Main />
        </StyledWrapper>
      </Layout>
    </ColorModeProvider>
  )
}

function Hero() {
  const {siteConfig} = useDocusaurusContext()

  return (
    <StyledHero>
      <HeroTitle>
        {siteConfig.title}
      </HeroTitle>
      <HeroSubtitle>{siteConfig.tagline}</HeroSubtitle>
      <HeroButtons/>
    </StyledHero>
  )
}

function HeroButtons() {
  return (
    <StyledHeroButtons>
      <Link
        className="button button--secondary button--lg"
        to="/docs/learn/intro">
        Get started
      </Link>
    </StyledHeroButtons>
  )
}

const StyledHeroButtons = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`

const StyledHero = styled.header`
  max-height: 400px;
  padding: 64px 0;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 20px;
  color: white;
  background: linear-gradient(-15deg, #937caf, #7954be);

  @media screen and (max-width: 996px) {
    padding: 32px 0;
  }
`

const HeroTitle = styled.h1`
  font-size: 48px;
  font-weight: 700;
  margin: 0;
  flex: 0;
  line-height: 48px;
`

const HeroSubtitle = styled.p`
  font-size: 24px;
  margin-bottom: 0;
  flex: 0;
`

const StyledWrapper = styled.div`
  flex: 1;
  min-height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;  
`

function Main() {
  const {colorMode} = useColorMode()

  return (
    <StyledMain $colorMode={colorMode}>
      <HomepageFeatures />
    </StyledMain>
  )
}

type StyledMainProps = {
  $colorMode: ColorMode
}

const StyledMain = styled.main<StyledMainProps>`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background-color: ${({$colorMode}) => $colorMode == "dark" ? "#242526" : "#eee"};
`

type FeatureItem = {
  title: string
  description: ReactNode
}

const features: FeatureItem[] = [
{
  title: 'Designed for audits',
  description: (
    <>
      The Helios Domain Specific Language (DSL) is a simple C-like language, designed for readability and auditability.
    </>
  ),
},
{
  title: 'Optimal UPLC',
  description: (
    <>
      Helios has one of the most advanced compilers in Cardano, producing compact and efficient on-chain bytecode.
    </>
  ),
},
{
  title: 'No external dependencies',
  description: (
    <>
      The Helios SDK doesn't have any external dependencies, minimizing supply chain risk.
    </>
  ),
},
/*{
  title: 'No WASM',
  description: (
    <>
      Helios doesn't use WASM, ensuring DApps built with Helios run anywhere.
    </>
  ),
},*/
]

function HomepageFeatures(): ReactNode {
  return (
    <StyledHomepageFeatures>
      {features.map((props, i) => (
        <Feature key={i} {...props} />
      ))}
    </StyledHomepageFeatures>
  )
}

const StyledHomepageFeatures = styled.section`
  display: flex;
  flex-direction: row;
  justify-content: center;
  flex-wrap: wrap;
  align-items: space-around;
  gap: 20px;
  margin: 20px 20px;
`

function Feature({title, description}: FeatureItem) {
  const {colorMode} = useColorMode()

  return (
    <StyledFeature $colorMode={colorMode}>      
      <Heading as="h3">{title}</Heading>
      <p>{description}</p>
    </StyledFeature>
  )
}

type StyledFeatureProps = {
  $colorMode: ColorMode
}

const  StyledFeature = styled.div<StyledFeatureProps>`
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border-radius: 5px;
  max-width: 350px;

  ${({$colorMode}) => $colorMode == "dark" ? `
    background-color: #eee;
    color: black;
  ` : `
    background-color: #303846;
    color: white;
  `}
`