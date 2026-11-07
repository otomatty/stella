public class Q12CountCharTests
{
    [Fact(DisplayName = "Q12 文字 c の個数")]
    public void Q12CountChar()
    {
        Assert.Equal(3, Answers.Q12CountChar("banana", 'a'));
        Assert.Equal(0, Answers.Q12CountChar("banana", 'z'));
        Assert.Equal(0, Answers.Q12CountChar("", 'a'));
    }
}
