public class Q17ContainsCharTests
{
    [Fact(DisplayName = "Q17 文字 c を含むか")]
    public void Q17ContainsChar()
    {
        Assert.Equal(true, Answers.Q17ContainsChar("abc", 'b'));
        Assert.Equal(false, Answers.Q17ContainsChar("abc", 'z'));
        Assert.Equal(false, Answers.Q17ContainsChar("", 'a'));
    }
}
