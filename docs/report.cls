\LoadClass[a4paper,11pt]{article}

% Essential packages
\RequirePackage{graphicx}
\RequirePackage{comment}
\RequirePackage{amssymb}
\RequirePackage{amsmath}
\RequirePackage{amsthm}
\RequirePackage{graphicx}
\RequirePackage{float}
\RequirePackage{comment}
\RequirePackage{caption}
\RequirePackage{multirow}
\RequirePackage{listings}
\RequirePackage{xcolor}
\RequirePackage[hidelinks]{hyperref}
\RequirePackage{enumitem}
\RequirePackage{titlesec}
\RequirePackage{algorithm}
\RequirePackage{algpseudocode}
\RequirePackage{tcolorbox}
\RequirePackage{fancyhdr}
\RequirePackage{mdframed}
\RequirePackage{tikz}
\RequirePackage{pgfplots}
\RequirePackage{parskip}
\RequirePackage{emptypage}
\RequirePackage{svg}

% Command to get the current month name
\newcommand{\MonthName}{
  \ifcase\month\or January\or February\or March\or April\or May\or June\or July\or August\or September\or October\or November\or December\fi}

% Configurazione di codeblocks con il pacchetto listings
\lstset{
  basicstyle=\ttfamily\small,
  keywordstyle=\color{blue},
  commentstyle=\color{green!50!black},
  stringstyle=\color{red},
  showstringspaces=false,
  breaklines=true,
  frame=single, % Adds a border around the code
  numbers=left, % Line numbers on the left
  numberstyle=\tiny\color{gray}, % Style of line numbers
  stepnumber=1, % Number of lines to skip between numbers
  numbersep=-5pt, % Distance between line numbers and code
  tabsize=2, % Tab size
  captionpos=b, % Position of the caption
}

% Header configuration
\pagestyle{fancy}
\fancyhf{} % Clean header and footer
\fancyhead[L]{\leftmark} % Current section on the top left
\fancyhead[R]{\thepage} % Page number on the right

% Defines a command for framed definitions with a blue background and a title
\newcommand{\definition}[2]{%
  \begin{mdframed}[
      hidealllines=false,
      linecolor=blue!80!black,
      linewidth=1pt,
      backgroundcolor=blue!5,
      roundcorner=5pt,
      frametitle={#1},
      frametitlebackgroundcolor=blue!80!black,
      frametitlefont=\color{white}\bfseries,
      innerbottommargin=10pt,
      skipabove=10pt,
      skipbelow=10pt
    ]
    {#2}
  \end{mdframed}
}

% Defines a command for framed Note boxes with green background and a title
\newcommand{\note}[1]{%
  \begin{mdframed}[
      hidealllines=false,
      linecolor=green!80!black,
      linewidth=1pt,
      backgroundcolor=green!5,
      roundcorner=5pt,
      frametitle={Note},
      frametitlebackgroundcolor=green!80!black,
      frametitlefont=\color{white}\bfseries,
      innerbottommargin=10pt,
      skipabove=10pt,
      skipbelow=10pt
    ]
    {#1}
  \end{mdframed}
}

\makeatletter
\def\proofname{\bfseries Proof}
\newcommand\HHUGE{\@setfontsize\Huge{35}{45}}
\makeatother

\pgfplotsset{compat=1.18}

\newcommand{\authors}[1]{\begin{tabular}{@{}ll@{}}Davide Donà &\quad \texttt{264467}\\Andrea Blushi&\quad \texttt{264468}\\Lorenzo Di Berardino&\quad \texttt{265984}\end{tabular}}

\newcommand{\maketitlepage}{
  \begin{titlepage}
    \begin{center}
      \Large University of Trento\\[-3pt]
      Master's Degree in Computer Science

      \vspace{1.25cm}

      \includesvg[width=0.7\textwidth]{../media/logo.svg}

      \vspace{1cm}
      \HHUGE\textbf{Data Visualization Proposal}

      \vspace{0.5cm}

      \LARGE Data Visualization Lab

      \vspace{-.3cm}

      \textsc{a.y.} 2025/2026

      \vspace{3.5cm}

      \LARGE\authors

      \vspace{3.5cm}
      \vfill

      \Large\MonthName\ \the\year
    \end{center}
  \end{titlepage}
  \pagenumbering{Roman}
}

% add after toc these commands:
\let\oldtableofcontents\tableofcontents
\renewcommand{\tableofcontents}{
  \oldtableofcontents
  \newpage
  \pagenumbering{arabic}
}
