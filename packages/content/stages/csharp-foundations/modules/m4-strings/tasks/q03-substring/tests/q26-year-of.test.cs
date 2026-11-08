public class Q26YearOfTests
{
    [Fact(DisplayName = "Q26 年の4文字")]
    public void Q26YearOf()
    {
        Assert.Equal("2026", Answers.Q26YearOf("20260903"));
        Assert.Equal("0999", Answers.Q26YearOf("09990101"));
    }
}
