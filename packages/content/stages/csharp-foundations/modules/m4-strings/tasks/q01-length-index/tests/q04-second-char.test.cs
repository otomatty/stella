public class Q04SecondCharTests
{
    [Fact(DisplayName = "Q04 2文字目")]
    public void Q04SecondChar()
    {
        Assert.Equal("b", Answers.Q04SecondChar("abc"));
        Assert.Equal("-", Answers.Q04SecondChar("A"));
        Assert.Equal("-", Answers.Q04SecondChar(""));
    }
}
