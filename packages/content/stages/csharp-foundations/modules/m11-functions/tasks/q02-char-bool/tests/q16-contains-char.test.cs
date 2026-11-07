public class Q16ContainsCharTests
{
    [Fact(DisplayName = "Q16 文字を含むか")]
    public void Q16ContainsChar()
    {
        Assert.Equal(true, Answers.Q16ContainsChar("abc", 'b'));
        Assert.Equal(false, Answers.Q16ContainsChar("abc", 'z'));
    }
}
