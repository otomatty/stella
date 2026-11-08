public class Q20CountZerosTests
{
    [Fact(DisplayName = "Q20 0 の個数")]
    public void Q20CountZeros()
    {
        Assert.Equal(1, Answers.Q20CountZeros("2026"));
        Assert.Equal(0, Answers.Q20CountZeros("111"));
        Assert.Equal(2, Answers.Q20CountZeros("00"));
        Assert.Equal(0, Answers.Q20CountZeros(""));
    }
}
