public class Q30WithoutFirstTests
{
    [Fact(DisplayName = "Q30 先頭を除く")]
    public void Q30WithoutFirst()
    {
        Assert.Equal("bc", Answers.Q30WithoutFirst("abc"));
        Assert.Equal("", Answers.Q30WithoutFirst("A"));
        Assert.Equal("026", Answers.Q30WithoutFirst("2026"));
    }
}
